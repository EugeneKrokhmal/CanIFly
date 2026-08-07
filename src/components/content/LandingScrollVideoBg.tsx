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
  children: ReactNode;
};

/** Matches the scrub encode (`fps=24`, short GOP). */
const FRAME = 1 / 24;
/** Do not request more seeks than the source can display. */
const SEEK_INTERVAL_MS = 50;

/**
 * How quickly the playhead catches the target (higher = snappier).
 * Per-frame exponential smoothing at ~60fps.
 */
const CATCH_UP = 0.14;

/** Intrinsic size of the scrub encode — keeps poster/video object-cover identical. */
const VIDEO_W = 1600;
const VIDEO_H = 900;

const MEDIA_VER = "scrub16";

type MediaApi = {
  /** 0–1 story progress → video playhead. */
  setProgress: (p: number) => void;
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
 */
export function LandingScrollVideoBg({
  src,
  srcMobile,
  srcAv1,
  srcHevc,
  poster,
  label,
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const targetRef = useRef(0);
  const playheadRef = useRef(0);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastSeekAtRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const runningRef = useRef(false);
  const scrubArmedRef = useRef(false);
  const warmStartedRef = useRef(false);
  const [frameReady, setFrameReady] = useState(false);
  /** Keep the HQ poster until the user starts scrubbing. */
  const [showVideo, setShowVideo] = useState(false);
  /** Once true, <source> URLs are mounted and the browser may download. */
  const [warmLoad, setWarmLoad] = useState(false);
  // Start false so SSR matches the first client paint; then pick mobile/desktop.
  const [useMobileSrc, setUseMobileSrc] = useState(false);

  const activeSrc = useMobileSrc && srcMobile ? srcMobile : src;
  const mediaSrc = `${activeSrc}?v=${MEDIA_VER}`;
  const mediaSrcAv1 =
    !useMobileSrc && srcAv1 ? `${srcAv1}?v=${MEDIA_VER}` : null;
  const mediaSrcHevc =
    !useMobileSrc && srcHevc ? `${srcHevc}?v=${MEDIA_VER}` : null;

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

  const tick = useCallback(() => {
    rafRef.current = null;
    const video = videoRef.current;
    if (!video) {
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

    if (reduceMotionRef.current) {
      playhead = target;
    } else {
      const delta = target - playhead;
      playhead += delta * CATCH_UP;
      if (Math.abs(delta) < FRAME * 0.15) {
        playhead = target;
      }
    }

    playheadRef.current = playhead;

    const needsSeek =
      !video.seeking && Math.abs(video.currentTime - playhead) >= FRAME * 0.35;
    const seekDue = performance.now() - lastSeekAtRef.current >= SEEK_INTERVAL_MS;
    if (needsSeek && seekDue) {
      try {
        if (typeof video.fastSeek === "function") {
          video.fastSeek(playhead);
        } else {
          video.currentTime = playhead;
        }
        lastSeekAtRef.current = performance.now();
      } catch {
        video.currentTime = playhead;
        lastSeekAtRef.current = performance.now();
      }
    }

    if (Math.abs(target - playhead) >= FRAME * 0.12) {
      rafRef.current = window.requestAnimationFrame(tick);
    } else {
      runningRef.current = false;
      if (!video.seeking && Math.abs(video.currentTime - target) > FRAME * 0.2) {
        video.currentTime = target;
      }
      playheadRef.current = target;
    }
  }, []);

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
      const next = Math.min(1, Math.max(0, p));
      progressRef.current = next;
      // Hold the master-frame poster until the user starts moving the story.
      if (next > 0.012 && !scrubArmedRef.current) {
        scrubArmedRef.current = true;
        armWarmLoad();
        setShowVideo(true);
      }
      kick();
    },
    [armWarmLoad, kick],
  );

  // Pick the 900px encode on phones (rotated plate); desktop keeps 1600.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setUseMobileSrc(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Warm the scrub file after first paint / on idle so the first seek is ready.
  useEffect(() => {
    if (reduceMotionRef.current) return;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    const start = () => armWarmLoad();

    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(start, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(start, 280);
    }

    return () => {
      if (idleId != null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [armWarmLoad]);

  // Attach sources / (re)load once warming or scrubbing begins / source swaps.
  useEffect(() => {
    if (!warmLoad) return;
    const video = videoRef.current;
    if (!video) return;
    setFrameReady(false);
    video.load();
  }, [warmLoad, mediaSrc]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceMotionRef.current = mq.matches;
    const onMq = () => {
      reduceMotionRef.current = mq.matches;
      kick();
    };
    mq.addEventListener("change", onMq);

    const video = videoRef.current;
    if (video) video.pause();

    const revealFirstFrame = () => {
      playheadRef.current = 0;
      targetRef.current = 0;
      setFrameReady(true);
      kick();
    };

    const onLoadedData = () => {
      if (!video) return;
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
        if (!video) return;
        if (video.readyState >= 2 && video.currentTime < FRAME) {
          video.removeEventListener("seeked", settle);
          revealFirstFrame();
        }
      }, 120);
    };

    if (video) {
      video.addEventListener("loadeddata", onLoadedData);
      if (video.readyState >= 2) onLoadedData();
    }

    return () => {
      mq.removeEventListener("change", onMq);
      if (video) video.removeEventListener("loadeddata", onLoadedData);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      runningRef.current = false;
    };
  }, [kick, warmLoad]);

  return (
    <LandingMediaContext.Provider value={{ setProgress }}>
      <article className="landing-page relative h-full overflow-hidden text-[var(--as-ink)] md:h-auto md:min-h-full md:overflow-visible">
        <div
          className="landing-scroll-video pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black md:fixed"
          aria-hidden
        >
          {!frameReady || !showVideo ? (
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
            preload={warmLoad ? "auto" : "none"}
            disablePictureInPicture
            aria-label={label}
          >
            {warmLoad ? (
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
                <source src={mediaSrc} type="video/mp4" />
              </>
            ) : null}
          </video>
          <div className="landing-slide-shade pointer-events-none absolute inset-y-0 left-0 w-full md:inset-x-0 md:bottom-0 md:top-auto md:h-[min(72vh,42rem)]" />
        </div>

        <div className="relative z-10 h-full md:h-auto">{children}</div>
      </article>
    </LandingMediaContext.Provider>
  );
}
