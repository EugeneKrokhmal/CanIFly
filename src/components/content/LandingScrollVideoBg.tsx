"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrandLogo } from "@/components/BrandLogo";

type Props = {
  /** H.264 desktop / tablet scrub encode. */
  src: string;
  /** Optional narrower encode for phones (rotated landscape plate). */
  srcMobile?: string;
  /** Optional AV1 — preferred when the browser supports it. */
  srcAv1?: string;
  /** Optional HEVC — good for Safari without AV1. */
  srcHevc?: string;
  poster: string;
  label: string;
  /** Status line on the preload gate. */
  loadingLabel?: string;
  children: ReactNode;
};

/** Matches the scrub encode (`fps=30`, short GOP). */
const FRAME = 1 / 30;
/** Desktop seek cadence — roughly one seek per source frame. */
const SEEK_INTERVAL_MS = 33;
/**
 * Mobile: do not time-throttle — we already wait for `seeked`.
 * Issuing a new seek while one is in flight is what causes hitching.
 */
const MOBILE_SEEK_INTERVAL_MS = 0;

/**
 * How quickly the logical playhead catches the target (higher = snappier).
 * Mobile jumps harder so fewer mid-GOP decode steps pile up.
 */
const CATCH_UP = 0.16;
const MOBILE_CATCH_UP = 0.55;

/** Intrinsic size of the scrub encode — keeps poster/video object-cover identical. */
const VIDEO_W = 1920;
const VIDEO_H = 1080;

const MEDIA_VER = "scrub19";

type MediaApi = {
  /** 0–1 story progress → video playhead. */
  setProgress: (p: number) => void;
  /** True once the scrub file is downloaded and the first frame is settled. */
  ready: boolean;
};

const LandingMediaContext = createContext<MediaApi | null>(null);

export function useLandingMedia() {
  const ctx = useContext(LandingMediaContext);
  if (!ctx) {
    throw new Error("useLandingMedia must be used within LandingScrollVideoBg");
  }
  return ctx;
}

/**
 * Fixed full-viewport muted video. Slide progress sets a target time; the
 * playhead eases toward it. Desktop uses a fixed plate over native scroll;
 * a bottom veil keeps centered copy readable.
 *
 * Mobile Safari/Chrome often ignore preload hints and stall on mid-GOP seeks
 * over the network — we fetch the active encode into a blob so scrubbing is
 * local, and we avoid fastSeek (keyframe snapping). A load gate holds the
 * story until that file is ready.
 */
export function LandingScrollVideoBg({
  src,
  srcMobile,
  srcAv1,
  srcHevc,
  poster,
  label,
  loadingLabel = "Preparing flight…",
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetRef = useRef(0);
  const playheadRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  /** True while a currentTime seek is in flight (wait for seeked). */
  const seekingRef = useRef(false);
  /** Latest desired time while a seek is in flight — applied on seeked. */
  const pendingSeekRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(false);
  const runningRef = useRef(false);
  const scrubArmedRef = useRef(false);
  const warmStartedRef = useRef(false);
  const mediaReadyRef = useRef(false);
  const isMobileRef = useRef(false);
  const [frameReady, setFrameReady] = useState(false);
  /** Keep the HQ poster until scrub starts (or until load gate finishes). */
  const [showVideo, setShowVideo] = useState(false);
  /** Once true, start fetching / attaching the scrub file. */
  const [warmLoad, setWarmLoad] = useState(false);
  // Start false so SSR matches the first client paint; then pick mobile/desktop.
  const [useMobileSrc, setUseMobileSrc] = useState(false);
  /** Object URL of the fully downloaded scrub file (or network fallback). */
  const [playbackSrc, setPlaybackSrc] = useState<string | null>(null);
  /** 0–1 download progress for the gate UI. */
  const [loadProgress, setLoadProgress] = useState(0);
  /** Overlay stays mounted through a short fade after ready. */
  const [gateVisible, setGateVisible] = useState(true);
  const [gateFading, setGateFading] = useState(false);

  const activeSrc = useMobileSrc && srcMobile ? srcMobile : src;
  const mediaSrc = `${activeSrc}?v=${MEDIA_VER}`;
  // Multi-codec only when scrubbing from the network (desktop optional local).
  // Blob path is always the H.264 encode — predictable seeks on every browser.
  const useNetworkSources = Boolean(
    playbackSrc &&
      !playbackSrc.startsWith("blob:") &&
      !useMobileSrc &&
      (srcAv1 || srcHevc),
  );
  const mediaSrcAv1 =
    useNetworkSources && srcAv1 ? `${srcAv1}?v=${MEDIA_VER}` : null;
  const mediaSrcHevc =
    useNetworkSources && srcHevc ? `${srcHevc}?v=${MEDIA_VER}` : null;

  const ready = frameReady;

  const applyProgressToTarget = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;

    if (reduceMotionRef.current) {
      targetRef.current = Math.min(FRAME, duration);
      return;
    }

    const p = Math.min(1, Math.max(0, progressRef.current));
    targetRef.current = p * Math.max(0, duration - FRAME);
  }, []);

  /** Snap to a source frame — cheaper for the decoder than arbitrary floats. */
  const quantizeTime = useCallback((t: number, duration: number) => {
    const capped = Math.min(duration - FRAME * 0.25, Math.max(0, t));
    return Math.round(capped / FRAME) * FRAME;
  }, []);

  /**
   * One seek at a time. Mobile Safari drops frames when currentTime is
   * overwritten mid-seek; queue the latest time and apply it on `seeked`.
   */
  const seekTo = useCallback(
    (video: HTMLVideoElement, time: number) => {
      const duration = video.duration;
      if (!duration || !Number.isFinite(duration)) return;
      const next = quantizeTime(time, duration);

      if (seekingRef.current || video.seeking) {
        pendingSeekRef.current = next;
        return;
      }

      if (Math.abs(video.currentTime - next) < FRAME * 0.4) {
        pendingSeekRef.current = null;
        return;
      }

      const seekInterval = isMobileRef.current
        ? MOBILE_SEEK_INTERVAL_MS
        : SEEK_INTERVAL_MS;
      if (performance.now() - lastSeekAtRef.current < seekInterval) {
        pendingSeekRef.current = next;
        return;
      }

      seekingRef.current = true;
      pendingSeekRef.current = null;
      lastSeekAtRef.current = performance.now();

      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        seekingRef.current = false;
        const queued = pendingSeekRef.current;
        pendingSeekRef.current = null;
        if (queued != null && Math.abs(video.currentTime - queued) >= FRAME * 0.4) {
          seekTo(video, queued);
        }
      };
      video.addEventListener("seeked", onSeeked);
      try {
        video.currentTime = next;
      } catch {
        video.removeEventListener("seeked", onSeeked);
        seekingRef.current = false;
      }
    },
    [quantizeTime],
  );

  const tick = useCallback(() => {
    rafRef.current = null;
    const video = videoRef.current;
    if (!video || !mediaReadyRef.current) {
      runningRef.current = false;
      return;
    }

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) {
      runningRef.current = false;
      return;
    }

    const target = Math.min(
      duration - FRAME * 0.25,
      Math.max(0, targetRef.current),
    );
    let playhead = playheadRef.current;
    const catchUp = isMobileRef.current ? MOBILE_CATCH_UP : CATCH_UP;

    if (reduceMotionRef.current) {
      playhead = target;
    } else {
      const delta = target - playhead;
      // Mobile: large deltas jump most of the way in one step (fewer seeks).
      if (isMobileRef.current && Math.abs(delta) > FRAME * 4) {
        playhead += delta * Math.min(1, catchUp * 1.4);
      } else {
        playhead += delta * catchUp;
      }
      if (Math.abs(delta) < FRAME * 0.15) {
        playhead = target;
      }
    }

    playheadRef.current = playhead;
    seekTo(video, playhead);

    if (
      Math.abs(target - playhead) >= FRAME * 0.12 ||
      seekingRef.current ||
      pendingSeekRef.current != null
    ) {
      rafRef.current = window.requestAnimationFrame(tick);
    } else {
      runningRef.current = false;
      if (
        !seekingRef.current &&
        !video.seeking &&
        Math.abs(video.currentTime - target) > FRAME * 0.2
      ) {
        seekTo(video, target);
      }
      playheadRef.current = target;
    }
  }, [seekTo]);

  const kick = useCallback(() => {
    applyProgressToTarget();
    if (runningRef.current) return;
    runningRef.current = true;
    rafRef.current = window.requestAnimationFrame(tick);
  }, [applyProgressToTarget, tick]);

  const armWarmLoad = useCallback(() => {
    if (warmStartedRef.current) return;
    warmStartedRef.current = true;
    setWarmLoad(true);
  }, []);

  const setProgress = useCallback(
    (p: number) => {
      if (!mediaReadyRef.current) return;
      const next = Math.min(1, Math.max(0, p));
      progressRef.current = next;
      if (next > 0.012 && !scrubArmedRef.current) {
        scrubArmedRef.current = true;
        setShowVideo(true);
      }
      kick();
    },
    [kick],
  );

  // Pick the 900px encode on phones (rotated plate); desktop keeps 1600.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      isMobileRef.current = mq.matches;
      setUseMobileSrc(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Start the scrub download as soon as the page mounts.
  useEffect(() => {
    armWarmLoad();
  }, [armWarmLoad]);

  // Lock the AppShell scrollport while the gate is up.
  useEffect(() => {
    if (!gateVisible) return;
    const root = document.querySelector<HTMLElement>(
      "[data-landing-scroll='true']",
    );
    if (!root) return;
    const prev = root.style.overflowY;
    root.style.overflowY = "hidden";
    return () => {
      root.style.overflowY = prev;
    };
  }, [gateVisible]);

  // Fade the gate out once the first frame is settled.
  useEffect(() => {
    if (!frameReady || !gateVisible) return;
    setLoadProgress(1);
    setShowVideo(true);
    setGateFading(true);
    const id = window.setTimeout(() => setGateVisible(false), 480);
    return () => window.clearTimeout(id);
  }, [frameReady, gateVisible]);

  // Actually download the scrub file. preload="auto" is a hint phones ignore.
  useEffect(() => {
    if (!warmLoad) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    mediaReadyRef.current = false;
    setFrameReady(false);
    setPlaybackSrc(null);
    setLoadProgress(0);
    seekingRef.current = false;
    pendingSeekRef.current = null;

    (async () => {
      try {
        const res = await fetch(mediaSrc, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`scrub fetch ${res.status}`);

        const total = Number(res.headers.get("content-length")) || 0;
        const body = res.body;
        let blob: Blob;

        if (body) {
          const reader = body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.byteLength;
              if (!cancelled) {
                if (total > 0) {
                  setLoadProgress(Math.min(0.97, received / total));
                } else {
                  setLoadProgress(Math.min(0.9, received / (10 * 1024 * 1024)));
                }
              }
            }
          }
          // Concatenate without spread (avoids huge arg lists on large files).
          const merged = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          blob = new Blob([merged], { type: "video/mp4" });
        } else {
          blob = await res.blob();
        }

        if (!cancelled) setLoadProgress(0.98);
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        setPlaybackSrc(objectUrl);
      } catch {
        if (cancelled) return;
        // Fall back to progressive HTTP — better than a blank plate.
        setLoadProgress(0.5);
        setPlaybackSrc(mediaSrc);
      }
    })();

    return () => {
      cancelled = true;
      mediaReadyRef.current = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };
  }, [warmLoad, mediaSrc]);

  // Attach the ready URL and settle the first frame.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onMq = () => {
      reduceMotionRef.current = mq.matches;
      kick();
    };
    mq.addEventListener("change", onMq);

    const video = videoRef.current;
    if (!video || !playbackSrc) {
      return () => mq.removeEventListener("change", onMq);
    }

    mediaReadyRef.current = false;
    setFrameReady(false);
    video.pause();
    video.load();

    const revealFirstFrame = () => {
      playheadRef.current = 0;
      targetRef.current = 0;
      mediaReadyRef.current = true;
      setFrameReady(true);
      kick();
    };

    const onLoadedData = () => {
      const settle = () => {
        video.removeEventListener("seeked", settle);
        revealFirstFrame();
      };
      video.addEventListener("seeked", settle);
      try {
        video.currentTime = 0;
      } catch {
        revealFirstFrame();
      }
      window.setTimeout(() => {
        if (video.readyState >= 2 && video.currentTime < FRAME) {
          video.removeEventListener("seeked", settle);
          revealFirstFrame();
        }
      }, 120);
    };

    video.addEventListener("loadeddata", onLoadedData);
    if (video.readyState >= 2) onLoadedData();

    return () => {
      mq.removeEventListener("change", onMq);
      video.removeEventListener("loadeddata", onLoadedData);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      runningRef.current = false;
      mediaReadyRef.current = false;
    };
  }, [kick, playbackSrc]);

  const pct = Math.round(loadProgress * 100);

  return (
    <LandingMediaContext.Provider value={{ setProgress, ready }}>
      <article
        className="landing-page relative h-full overflow-hidden text-[var(--as-ink)] md:h-auto md:min-h-full md:overflow-visible"
        aria-busy={gateVisible}
      >
        <div
          className="landing-scroll-video pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black md:fixed"
          aria-hidden
        >
          {!showVideo || !frameReady ? (
            <picture className="absolute inset-0 block h-full w-full">
              <source
                type="image/webp"
                srcSet={`${poster.replace(/\.(jpe?g|png)$/i, ".webp")}?v=${MEDIA_VER}`}
              />
              <img
                src={`${poster}?v=${MEDIA_VER}`}
                alt=""
                width={VIDEO_W}
                height={VIDEO_H}
                decoding="async"
                fetchPriority="high"
                className="landing-bg-media absolute inset-0 h-full w-full object-cover"
              />
            </picture>
          ) : null}
          <video
            ref={videoRef}
            className="landing-bg-media absolute inset-0 h-full w-full object-cover"
            style={{ opacity: showVideo && frameReady ? 1 : 0 }}
            width={VIDEO_W}
            height={VIDEO_H}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            aria-label={label}
          >
            {playbackSrc ? (
              <>
                {mediaSrcAv1 ? (
                  <source
                    src={mediaSrcAv1}
                    type='video/mp4; codecs="av01.0.08M.08"'
                  />
                ) : null}
                {mediaSrcHevc ? (
                  <source
                    src={mediaSrcHevc}
                    type='video/mp4; codecs="hvc1.1.6.L93.B0"'
                  />
                ) : null}
                <source src={playbackSrc} type="video/mp4" />
              </>
            ) : null}
          </video>
          <div className="landing-slide-shade pointer-events-none absolute inset-y-0 left-0 w-full md:inset-x-0 md:bottom-0 md:top-auto md:h-[min(72vh,42rem)]" />
        </div>

        <div
          className={`relative z-10 h-full md:h-auto ${gateVisible ? "pointer-events-none" : ""}`}
          aria-hidden={gateVisible}
        >
          {children}
        </div>

        {gateVisible ? (
          <div
            className={`landing-load-gate fixed inset-0 z-[80] flex flex-col items-center justify-center px-8 ${
              gateFading ? "landing-load-gate--out" : ""
            }`}
            role="status"
            aria-live="polite"
            aria-label={loadingLabel}
          >
            <div className="landing-load-gate__veil absolute inset-0" aria-hidden />
            <BrandLogo
              className="relative z-[1] h-9 w-auto text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.45)] sm:h-11"
              title="CanIFly"
            />
            <p className="relative z-[1] mt-5 text-sm tracking-wide text-white/80">
              {loadingLabel}
            </p>
            <div
              className="relative z-[1] mt-6 h-[2px] w-40 overflow-hidden rounded-full bg-white/20 sm:w-52"
              aria-hidden
            >
              <div
                className="landing-load-gate__bar h-full rounded-full bg-white"
                style={{ width: `${Math.max(4, pct)}%` }}
              />
            </div>
            <span className="sr-only">{pct}%</span>
          </div>
        ) : null}
      </article>
    </LandingMediaContext.Provider>
  );
}
