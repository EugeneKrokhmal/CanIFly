"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { useLandingMedia } from "@/components/content/LandingScrollVideoBg";

export type LandingSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  body: string;
  steps?: string[];
  primaryCta?: string;
  secondaryCta?: string;
  footnote?: string;
  showBrand?: boolean;
};

type Props = {
  slides: LandingSlide[];
  backLabel: string;
  /** First-screen gesture hint (phones). */
  swipeHint: string;
  /** First-screen gesture hint (desktop scroll). */
  scrollHint: string;
};

const SWIPE_PX = 56;
const WHEEL_IDLE_MS = 160;
/** Commit a wheel scrub once progress crosses this fraction of the viewport. */
const WHEEL_COMMIT_FRAC = 0.28;
/** Matches the hero clip altitude arc (0 → 120 m AGL). */
const ALT_MAX_M = 120;
const ZOOM_MS = 820;
const ZOOM_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
/**
 * Viewport-heights of scroll per altitude step on desktop.
 * >1 slows the story relative to the wheel / trackpad.
 */
const SCROLL_SEGMENT = 1.9;
/** Mobile swipe distance vs desktop — twice as much travel per slide. */
const MOBILE_SEGMENT = SCROLL_SEGMENT * 2;
/** Mobile settle animation — twice the desktop chrome transition. */
const MOBILE_ZOOM_MS = ZOOM_MS * 2;

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable="true"], [role="textbox"]',
      ),
    )
  );
}

function LandingDroneMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="4" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="28" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="4" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="28" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 5.5 12 9m13.5-3.5L20 9M6.5 14.5 12 11m13.5 3.5L20 11"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="11"
        y="7.5"
        width="10"
        height="5"
        rx="1.5"
        fill="currentColor"
      />
    </svg>
  );
}

/** How small the leaving slide gets before / during the handoff. */
const SHRINK_EXTRA = 2.6;
/** How oversized the next slide is at the start of its fly-through. */
const FLY_IN_EXTRA = 3;
/**
 * Where the handoff begins within each altitude step.
 * Earlier = next slide appears sooner (still huge); longer fade window.
 */
const FADE_START = 0.52;

function smooth01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Soft-start shrink: 1 → 1/(1+SHRINK_EXTRA) as distance 0 → 1. */
function scaleShrinking(distance: number): number {
  const x = Math.min(1, Math.max(0, distance));
  return 1 / (1 + SHRINK_EXTRA * Math.pow(x, 1.4));
}

/**
 * Fly-through enter during the handoff.
 * fade 0 = just piercing the lens (very large); fade 1 = settled at 1.
 */
function scaleFlyingIn(fade: number): number {
  const remaining = 1 - Math.min(1, Math.max(0, fade));
  return 1 + FLY_IN_EXTRA * Math.pow(remaining, 0.72);
}

type ZoomPaint = {
  opacity: number;
  copyTransform: string;
  zIndex: number;
};

/**
 * Scroll motion:
 * - Within a step: the leaving slide shrinks with scroll (stays opaque, sharp).
 * - From FADE_START: leaving fades while already small; next flies in from
 *   oversized and settles at scale(1).
 *
 * Near whole marks we snap so 0.999… and 1.000 don't alternate leave/enter.
 */
function zoomStyle(
  slideIndex: number,
  floatIndex: number,
  reduceMotion: boolean,
  opts: { started: boolean; last: number },
): ZoomPaint {
  if (!opts.started) {
    if (slideIndex === 0) {
      return {
        opacity: 1,
        copyTransform: "scale(1)",
        zIndex: 20,
      };
    }
    return {
      opacity: 0,
      copyTransform: reduceMotion ? "scale(1)" : `scale(${scaleFlyingIn(0)})`,
      zIndex: 0,
    };
  }

  const SNAP = 0.0025;
  let fi = Math.min(opts.last, Math.max(0, floatIndex));
  const nearest = Math.round(fi);
  if (Math.abs(fi - nearest) <= SNAP) {
    fi = Math.min(opts.last, Math.max(0, nearest));
  }

  let from = Math.floor(fi);
  let t = fi - from;
  if (t >= 1 - SNAP) {
    from = Math.min(opts.last, from + 1);
    t = 0;
  }

  const leaving = from;
  const entering = from + 1;

  if (t <= SNAP) {
    if (slideIndex === leaving) {
      return {
        opacity: 1,
        copyTransform: "scale(1)",
        zIndex: 20,
      };
    }
    const ahead = slideIndex > leaving;
    return {
      opacity: 0,
      copyTransform: reduceMotion
        ? "scale(1)"
        : `scale(${ahead ? scaleFlyingIn(0) : scaleShrinking(1)})`,
      zIndex: 0,
    };
  }

  const leaveScale = reduceMotion ? 1 : scaleShrinking(t);

  let leaveOpacity = 1;
  let enterOpacity = 0;
  let enterFade = 0;
  if (t > FADE_START) {
    enterFade = smooth01((t - FADE_START) / (1 - FADE_START));
    leaveOpacity = 1 - enterFade;
    enterOpacity = smooth01(Math.min(1, enterFade / 0.72));
  }

  if (slideIndex === leaving) {
    return {
      opacity: leaveOpacity,
      copyTransform: `scale(${leaveScale})`,
      zIndex: 18,
    };
  }

  if (slideIndex === entering) {
    const enterScale = reduceMotion ? 1 : scaleFlyingIn(enterFade);
    return {
      opacity: enterOpacity,
      copyTransform: `scale(${enterScale})`,
      zIndex: 30,
    };
  }

  const ahead = slideIndex > entering;
  return {
    opacity: 0,
    copyTransform: reduceMotion
      ? "scale(1)"
      : `scale(${ahead ? scaleFlyingIn(0) : scaleShrinking(1)})`,
    zIndex: 0,
  };
}

/** Imperative paint — keeps scroll off the React render path. */
function paintStoryMotion(
  stage: HTMLElement | null,
  drone: HTMLElement | null,
  floatIndex: number,
  slideCount: number,
  started: boolean,
  reduceMotion: boolean,
) {
  if (!stage) return;
  const last = Math.max(0, slideCount - 1);
  const progress = last <= 0 ? 0 : floatIndex / last;
  if (drone) {
    drone.style.top = `${(1 - progress) * 100}%`;
  }

  const sections = stage.querySelectorAll<HTMLElement>("[data-landing-slide]");
  for (let i = 0; i < sections.length; i++) {
    const el = sections[i];
    const zs = zoomStyle(i, floatIndex, reduceMotion, { started, last });
    el.style.opacity = zs.opacity === 0 ? "0" : zs.opacity.toFixed(4);
    el.style.zIndex = String(zs.zIndex);
    // Slides must not steal hits from the fixed altimeter — only the copy is live.
    el.style.pointerEvents = "none";
    el.setAttribute("aria-hidden", zs.opacity > 0.55 ? "false" : "true");

    const copy = el.querySelector<HTMLElement>("[data-landing-copy]");
    if (!copy) continue;
    const scaleMatch = /^scale\((.+)\)$/.exec(zs.copyTransform);
    copy.style.transform = scaleMatch
      ? `scale(${scaleMatch[1]})`
      : zs.copyTransform;

    // Blur grows with the fly-through scale. Quantizing to whole pixels avoids
    // rewriting the filter on every scroll frame.
    const scale = scaleMatch ? Number(scaleMatch[1]) : 1;
    const blurPx = Math.round(
      Math.min(14, Math.max(0, ((scale - 1) / FLY_IN_EXTRA) * 14)),
    );
    const blurState = String(blurPx);
    if (copy.dataset.landingBlur !== blurState) {
      copy.dataset.landingBlur = blurState;
      copy.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";
    }

    const interactive = zs.opacity > 0.55;
    copy.style.pointerEvents = interactive ? "auto" : "none";
  }
}

/**
 * Discrete swipe / wheel / drag slides that settle onto each altitude step.
 */
function SlideCopyBody({
  slide,
  backLabel,
  isLast,
  interactive,
}: {
  slide: LandingSlide;
  backLabel: string;
  isLast: boolean;
  interactive: boolean;
}) {
  return (
    <>
      {slide.showBrand ? (
        <p className="font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.25rem)] font-extrabold tracking-tight text-white">
          CanI<span className="text-[var(--as-rausch)]">fly</span>
        </p>
      ) : slide.eyebrow ? (
        <p className="font-[family-name:var(--font-display)] text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {slide.eyebrow}
        </p>
      ) : null}

      <h1
        className={`font-[family-name:var(--font-display)] font-bold leading-[1.15] tracking-tight text-white ${
          slide.showBrand
            ? "mt-3 text-[clamp(1.35rem,3.6vw,2.15rem)]"
            : "mt-2 text-[clamp(1.6rem,4.2vw,2.6rem)]"
        }`}
      >
        {slide.title}
      </h1>

      <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-white/85 sm:text-[17px]">
        {slide.body}
      </p>

      {slide.steps?.length ? (
        <ol className="mx-auto mt-5 max-w-md space-y-2 text-left text-[14px] leading-relaxed text-white/90 sm:text-[15px]">
          {slide.steps.map((step, si) => (
            <li key={step} className="flex gap-3">
              <span className="font-[family-name:var(--font-display)] font-bold text-[var(--as-rausch)]">
                {si + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {(slide.primaryCta || slide.secondaryCta) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {slide.primaryCta ? (
            interactive ? (
              <Link
                href="/"
                className="as-press inline-flex h-11 items-center justify-center rounded-[var(--as-radius)] bg-[var(--as-rausch)] px-5 text-[14px] font-semibold text-white hover:bg-[var(--as-rausch-hover)]"
              >
                {slide.primaryCta}
              </Link>
            ) : (
              <span className="inline-flex h-11 items-center justify-center rounded-[var(--as-radius)] bg-[var(--as-rausch)] px-5 text-[14px] font-semibold text-white">
                {slide.primaryCta}
              </span>
            )
          ) : null}
          {slide.secondaryCta ? (
            interactive ? (
              <Link
                href="/guide"
                className="as-press inline-flex h-11 items-center justify-center rounded-[var(--as-radius)] border border-white/35 bg-white/15 px-5 text-[14px] font-semibold text-white hover:bg-white/22"
              >
                {slide.secondaryCta}
              </Link>
            ) : (
              <span className="inline-flex h-11 items-center justify-center rounded-[var(--as-radius)] border border-white/35 bg-white/15 px-5 text-[14px] font-semibold text-white">
                {slide.secondaryCta}
              </span>
            )
          ) : null}
        </div>
      )}

      {slide.footnote ? (
        <p className="mx-auto mt-6 max-w-xl text-[12px] leading-relaxed text-white/55">
          {slide.footnote}
        </p>
      ) : null}
    </>
  );
}

function SwipeHintChevron({ up }: { up: boolean }) {
  return (
    <svg
      className="landing-swipe-hint__chevron h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d={up ? "M6 14l6-6 6 6" : "M6 10l6 6 6-6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LandingStorySlides({
  slides,
  backLabel,
  swipeHint,
  scrollHint,
}: Props) {
  const { setProgress, ready } = useLandingMedia();
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const dragRef = useRef<{
    id: number;
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
    dragging: boolean;
  } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [started, setStarted] = useState(false);
  // Always start false so SSR HTML matches the first client paint.
  const [isDesktop, setIsDesktop] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const startedRef = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const droneRef = useRef<HTMLButtonElement | null>(null);
  const wheelYRef = useRef(0);
  const wheelIdleRef = useRef<number | null>(null);
  const lastFloatRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const mobileAnimRafRef = useRef<number | null>(null);
  /** True while a slide settle animation is in flight — ignore further gestures. */
  const settlingRef = useRef(false);
  const count = slides.length;
  const last = Math.max(0, count - 1);

  const cancelMobileAnim = useCallback(() => {
    if (mobileAnimRafRef.current != null) {
      window.cancelAnimationFrame(mobileAnimRafRef.current);
      mobileAnimRafRef.current = null;
    }
    settlingRef.current = false;
  }, []);

  const paint = useCallback(
    (fi: number) => {
      lastFloatRef.current = fi;
      paintStoryMotion(
        stageRef.current,
        droneRef.current,
        fi,
        count,
        startedRef.current,
        reduceMotionRef.current,
      );
    },
    [count],
  );

  const beginStory = useCallback(() => {
    if (!readyRef.current) return;
    if (startedRef.current) return;
    startedRef.current = true;
    setStarted(true);
  }, []);

  const syncProgress = useCallback(
    (index: number, offsetPx = 0) => {
      if (!readyRef.current) return;
      if (last <= 0) {
        setProgress(0);
        return;
      }
      const h =
        stageRef.current?.clientHeight ||
        trackRef.current?.clientHeight ||
        window.innerHeight;
      const p = (index - offsetPx / h) / last;
      setProgress(Math.min(1, Math.max(0, p)));
    },
    [last, setProgress],
  );

  const getDesktopScrollRoot = useCallback((): HTMLElement | null => {
    if (typeof document === "undefined") return null;
    return document.querySelector<HTMLElement>("[data-landing-scroll='true']");
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      if (!readyRef.current) return;
      // One slide change at a time — ignore input while settling.
      if (settlingRef.current) return;
      beginStory();
      const i = Math.min(last, Math.max(0, index));
      if (i === activeRef.current && Math.abs(lastFloatRef.current - i) < 0.002) {
        return;
      }
      activeRef.current = i;
      setActive(i);
      setDragY(0);
      setDragging(false);
      wheelYRef.current = 0;
      if (wheelIdleRef.current != null) {
        window.clearTimeout(wheelIdleRef.current);
        wheelIdleRef.current = null;
      }

      // Same settle animation on desktop and mobile — ease floatIndex to the
      // target so the fly-through lands on a slide, not mid-scrub.
      if (mobileAnimRafRef.current != null) {
        window.cancelAnimationFrame(mobileAnimRafRef.current);
        mobileAnimRafRef.current = null;
      }
      const from = lastFloatRef.current;
      const settleMs = isDesktop ? ZOOM_MS : MOBILE_ZOOM_MS;
      if (reduceMotionRef.current || Math.abs(from - i) < 0.002) {
        syncProgress(i, 0);
        paint(i);
        settlingRef.current = false;
        return;
      }

      settlingRef.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / settleMs);
        const fi = from + (i - from) * smooth01(t);
        paint(fi);
        setProgress(last <= 0 ? 0 : fi / last);
        if (t < 1) {
          mobileAnimRafRef.current = window.requestAnimationFrame(tick);
          return;
        }
        mobileAnimRafRef.current = null;
        settlingRef.current = false;
        paint(i);
        syncProgress(i, 0);
      };
      mobileAnimRafRef.current = window.requestAnimationFrame(tick);
    },
    [
      beginStory,
      isDesktop,
      last,
      paint,
      setProgress,
      syncProgress,
    ],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    return () => {
      if (wheelIdleRef.current != null) {
        window.clearTimeout(wheelIdleRef.current);
      }
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      if (dragRafRef.current != null) {
        window.cancelAnimationFrame(dragRafRef.current);
      }
      if (mobileAnimRafRef.current != null) {
        window.cancelAnimationFrame(mobileAnimRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reduceMotionRef.current = mq.matches;
      setReduceMotion(mq.matches);
      paint(lastFloatRef.current);
    };
    apply();
    mq.addEventListener("change", apply);
    syncProgress(0, 0);
    paint(0);
    return () => mq.removeEventListener("change", apply);
  }, [paint, syncProgress]);

  // Re-paint when story arms / active chrome updates — never let React
  // style props fight the imperative scroll paint.
  useLayoutEffect(() => {
    paint(lastFloatRef.current);
  }, [paint, started, active]);

  // Discrete swipe / wheel / drag on both platforms — settle to a slide.
  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;

    const segmentMul = isDesktop ? SCROLL_SEGMENT : MOBILE_SEGMENT;
    const segmentPx = () =>
      (root.clientHeight || window.innerHeight) * segmentMul;

    const settleWheel = () => {
      wheelIdleRef.current = null;
      const seg = segmentPx();
      const dy = wheelYRef.current;
      let next = activeRef.current;
      if (dy < -SWIPE_PX || dy < -seg * WHEEL_COMMIT_FRAC) next += 1;
      else if (dy > SWIPE_PX || dy > seg * WHEEL_COMMIT_FRAC) next -= 1;
      goToSlide(next);
    };

    const onWheel = (e: WheelEvent) => {
      if (!readyRef.current) {
        e.preventDefault();
        return;
      }
      if (settlingRef.current) {
        e.preventDefault();
        return;
      }
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      if (Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      cancelMobileAnim();
      beginStory();

      const seg = segmentPx();
      const cur = activeRef.current;
      let delta = -e.deltaY;
      if (cur === 0 && wheelYRef.current + delta > 0) delta *= 0.28;
      if (cur === last && wheelYRef.current + delta < 0) delta *= 0.28;
      const nextY = Math.max(
        -seg * 1.05,
        Math.min(seg * 1.05, wheelYRef.current + delta),
      );

      wheelYRef.current = nextY;
      setDragging(true);
      setDragY(nextY);
      syncProgress(cur, nextY / segmentMul);

      const crossedNext = nextY <= -seg * WHEEL_COMMIT_FRAC;
      const crossedPrev = nextY >= seg * WHEEL_COMMIT_FRAC;
      if (crossedNext || crossedPrev) {
        if (wheelIdleRef.current != null) {
          window.clearTimeout(wheelIdleRef.current);
          wheelIdleRef.current = null;
        }
        goToSlide(cur + (crossedNext ? 1 : -1));
        return;
      }

      if (wheelIdleRef.current != null) {
        window.clearTimeout(wheelIdleRef.current);
      }
      wheelIdleRef.current = window.setTimeout(settleWheel, WHEEL_IDLE_MS);
    };

    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (settlingRef.current) {
        if (
          e.key === "ArrowDown" ||
          e.key === "PageDown" ||
          e.key === "ArrowUp" ||
          e.key === "PageUp" ||
          e.key === "Home" ||
          e.key === "End"
        ) {
          e.preventDefault();
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        beginStory();
        goToSlide(activeRef.current + 1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        beginStory();
        goToSlide(activeRef.current - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        beginStory();
        goToSlide(0);
      } else if (e.key === "End") {
        e.preventDefault();
        beginStory();
        goToSlide(last);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!readyRef.current) return;
      if (settlingRef.current) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest("a, button, input, textarea, select, label")
      ) {
        return;
      }
      cancelMobileAnim();
      dragRef.current = {
        id: e.pointerId,
        startY: e.clientY,
        lastY: e.clientY,
        lastT: performance.now(),
        velocity: 0,
        dragging: false,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      const now = performance.now();
      const dy = e.clientY - d.startY;
      const dt = Math.max(1, now - d.lastT);
      d.velocity = (e.clientY - d.lastY) / dt;
      d.lastY = e.clientY;
      d.lastT = now;
      if (!d.dragging) {
        if (Math.abs(dy) < 10) return;
        d.dragging = true;
        beginStory();
        setDragging(true);
        try {
          root.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      const seg = segmentPx();
      const atStart = activeRef.current === 0 && dy > 0;
      const atEnd = activeRef.current === last && dy < 0;
      const applied = atStart || atEnd ? dy * 0.28 : dy;
      const clamped = Math.max(-seg * 1.05, Math.min(seg * 1.05, applied));
      setDragY(clamped);
      syncProgress(activeRef.current, clamped / segmentMul);
    };

    const endDrag = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || d.id !== e.pointerId) return;
      dragRef.current = null;
      try {
        root.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (!d.dragging) {
        setDragging(false);
        setDragY(0);
        return;
      }
      const total = e.clientY - d.startY;
      const velocity = d.velocity;
      const seg = segmentPx();
      let next = activeRef.current;
      if (total < -SWIPE_PX || total < -seg * WHEEL_COMMIT_FRAC || velocity < -0.45)
        next += 1;
      else if (
        total > SWIPE_PX ||
        total > seg * WHEEL_COMMIT_FRAC ||
        velocity > 0.45
      )
        next -= 1;
      goToSlide(next);
    };

    // Block native page scroll on the landing shell while we own the gesture.
    const shell = getDesktopScrollRoot();
    const prevOverflow = shell?.style.overflowY ?? "";
    if (shell) shell.style.overflowY = "hidden";

    root.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);

    return () => {
      if (shell) shell.style.overflowY = prevOverflow;
      root.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerup", endDrag);
      root.removeEventListener("pointercancel", endDrag);
    };
  }, [
    beginStory,
    cancelMobileAnim,
    getDesktopScrollRoot,
    goToSlide,
    isDesktop,
    last,
    syncProgress,
  ]);

  // floatIndex from discrete active + drag — paint without React.
  useEffect(() => {
    if (mobileAnimRafRef.current != null) return;
    const segmentMul = isDesktop ? SCROLL_SEGMENT : MOBILE_SEGMENT;
    const schedule = () => {
      if (dragRafRef.current != null) return;
      dragRafRef.current = window.requestAnimationFrame(() => {
        dragRafRef.current = null;
        if (mobileAnimRafRef.current != null) return;
        const h = Math.max(1, trackRef.current?.clientHeight ?? 800);
        const fi = Math.min(
          last,
          Math.max(0, active - dragY / (h * segmentMul)),
        );
        paint(fi);
      });
    };
    schedule();
  }, [active, dragY, isDesktop, last, paint]);

  // Imperative paint drives motion on both platforms (swipe / settle).
  const zoomTransition = "none";

  return (
    <div
      ref={trackRef}
      className="landing-story-track relative h-full touch-none select-none overflow-hidden"
      style={
        {
          ["--landing-slides" as string]: Math.max(1, count),
          ["--landing-segment" as string]: SCROLL_SEGMENT,
          touchAction: "none",
        } as CSSProperties
      }
    >
      <div
        ref={stageRef}
        className="landing-story-stage relative h-full overflow-hidden"
      >
          <div className="landing-story-stack absolute inset-0 z-0">
            {slides.map((slide, i) => {
              const isActive = i === active;
              return (
                <section
                  key={slide.id}
                  data-landing-slide={i}
                  className={`landing-story-slide absolute inset-0 flex items-center justify-center px-6 py-24 md:pl-20 md:pr-10 lg:px-24 ${
                    isActive ? "is-active" : ""
                  }`}
                  style={{
                    // Opacity / z-index / pointer-events are painted imperatively.
                    // Do not set them here — React would reset them on every
                    // active-chrome re-render and flash the wrong slide.
                    transition: zoomTransition,
                    willChange: "opacity",
                  }}
                >
                  <div
                    data-landing-copy
                    className={`landing-hero-copy relative z-10 mx-auto w-full max-w-xl text-center md:max-w-2xl ${
                      isActive ? "is-current" : "is-passed"
                    }`}
                    style={{
                      transition: `${zoomTransition}, filter 80ms linear`,
                      willChange: "transform",
                    }}
                  >
                    <SlideCopyBody
                      slide={slide}
                      backLabel={backLabel}
                      isLast={i === count - 1}
                      interactive
                    />
                  </div>
                </section>
              );
            })}
          </div>

          {/* Desktop only — mobile uses swipe without the altitude chrome. */}
          <nav
            className="landing-altimeter pointer-events-auto absolute left-0 top-1/2 z-[60] hidden -translate-y-1/2 md:block sm:left-3"
            aria-label="Altitude"
          >
            <div className="landing-altimeter-rail relative h-[min(52dvh,22rem)] w-12">
              <div className="landing-altimeter-line absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/25" />
              {slides.map((slide, i) => {
                const t = last <= 0 ? 0 : i / last;
                const alt = Math.round(t * ALT_MAX_M);
                const isActive = i === active;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    className="as-press landing-altimeter-tick absolute left-1/2 z-[1] flex min-h-11 min-w-11 -translate-x-1/2 flex-col items-center justify-start pt-1"
                    style={{ top: `calc(${(1 - t) * 100}% - 3px)` }}
                    aria-label={`${slide.title} — ${alt} m`}
                    aria-current={isActive ? "true" : undefined}
                    onClick={() => goToSlide(i)}
                  >
                    <span
                      className="shrink-0 rounded-full border transition-[width,height,background-color,border-color,opacity] duration-300"
                      style={{
                        width: 6,
                        height: 6,
                        opacity: isActive ? 0 : 1,
                        background: "rgba(255,255,255,0.35)",
                        borderColor: "rgba(255,255,255,0.35)",
                      }}
                    />
                    <span
                      className="pt-2 font-[family-name:var(--font-display)] text-[10px] font-bold leading-none tabular-nums transition-colors duration-300"
                      style={{
                        color: isActive
                          ? "rgba(255,255,255,0.95)"
                          : "rgba(255,255,255,0.45)",
                      }}
                    >
                      {alt}
                      <span className="ml-0.5 font-semibold opacity-70">m</span>
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                ref={droneRef}
                className="landing-altimeter-drone absolute left-1/2 z-[2] grid h-8 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center border-0 bg-transparent p-0"
                aria-label="Continue to the next altitude"
                onClick={() => {
                  // The marker sits between ticks while scrubbing. Never let a
                  // click fall through to a lower, already-passed tick.
                  goToSlide(Math.ceil(lastFloatRef.current));
                }}
                style={{
                  top: "100%",
                  transition:
                    reduceMotion || dragging
                      ? "none"
                      : `top ${isDesktop ? ZOOM_MS : MOBILE_ZOOM_MS}ms ${ZOOM_EASE}`,
                  willChange: "top",
                }}
              >
                <LandingDroneMark className="h-4 w-7 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.65)]" />
              </button>
            </div>
          </nav>

          {ready && !started && !reduceMotion ? (
            <div
              className={`landing-swipe-hint pointer-events-none absolute inset-x-0 bottom-[max(3.5rem,calc(env(safe-area-inset-bottom)+2.75rem))] z-[40] flex flex-col items-center gap-1 text-white/80 ${
                isDesktop ? "landing-swipe-hint--down" : "landing-swipe-hint--up"
              }`}
              role="status"
              aria-live="polite"
            >
              {isDesktop ? (
                <>
                  <span className="landing-swipe-hint__label text-[11px] font-semibold uppercase tracking-[0.22em]">
                    {scrollHint}
                  </span>
                  <SwipeHintChevron up={false} />
                </>
              ) : (
                <>
                  <SwipeHintChevron up />
                  <span className="landing-swipe-hint__label text-[11px] font-semibold uppercase tracking-[0.22em]">
                    {swipeHint}
                  </span>
                </>
              )}
            </div>
          ) : null}
      </div>
    </div>
  );
}
