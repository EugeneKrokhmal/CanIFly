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
  /** H.264 fallback (widest support). */
  src: string;
  /** Optional AV1 — preferred when the browser supports it. */
  srcAv1?: string;
  /** Optional HEVC — good for Safari without AV1. */
  srcHevc?: string;
  poster: string;
  label: string;
  children: ReactNode;
};

/** Matches the scrub encode (`fps=20`, short GOP). */
const FRAME = 1 / 20;
/** Do not request more seeks than the source can display. */
const SEEK_INTERVAL_MS = 50;

/**
 * How quickly the playhead catches the target (higher = snappier).
 * Per-frame exponential smoothing at ~60fps.
 */
const CATCH_UP = 0.14;

/** Intrinsic size of the scrub encode — keeps poster/video object-cover identical. */
const VIDEO_W = 1920;
const VIDEO_H = 1080;

const MEDIA_VER = "scrub14";

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
  const [frameReady, setFrameReady] = useState(false);
  /** Keep the HQ poster until the user starts scrubbing. */
  const [showVideo, setShowVideo] = useState(false);

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

  const setProgress = useCallback(
    (p: number) => {
      const next = Math.min(1, Math.max(0, p));
      progressRef.current = next;
      // Hold the master-frame poster until the user starts moving the story.
      if (next > 0.012 && !scrubArmedRef.current) {
        scrubArmedRef.current = true;
        setShowVideo(true);
      }
      kick();
    },
    [kick],
  );

  // Keep network transfer behind the poster until the visitor starts scrubbing.
  useEffect(() => {
    if (!showVideo) return;
    videoRef.current?.load();
  }, [showVideo]);

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
  }, [kick]);

  return (
    <LandingMediaContext.Provider value={{ setProgress }}>
      <article className="landing-page relative h-full overflow-hidden text-[var(--as-ink)] md:h-auto md:min-h-full md:overflow-visible">
        <div
          className="landing-scroll-video pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black md:fixed"
          aria-hidden
        >
          {!frameReady ? (
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
            preload={showVideo ? "auto" : "none"}
            disablePictureInPicture
            aria-label={label}
          >
            {srcAv1 ? (
              <source
                src={`${srcAv1}?v=${MEDIA_VER}`}
                type='video/mp4; codecs="av01.0.08M.08"'
              />
            ) : null}
            {srcHevc ? (
              <source
                src={`${srcHevc}?v=${MEDIA_VER}`}
                type='video/mp4; codecs="hvc1.1.6.L93.B0"'
              />
            ) : null}
            <source src={`${src}?v=${MEDIA_VER}`} type="video/mp4" />
          </video>
          <div className="landing-slide-shade pointer-events-none absolute inset-y-0 left-0 w-full md:inset-x-0 md:bottom-0 md:top-auto md:h-[min(72vh,42rem)]" />
        </div>

        <div className="relative z-10 h-full md:h-auto">{children}</div>
      </article>
    </LandingMediaContext.Provider>
  );
}
