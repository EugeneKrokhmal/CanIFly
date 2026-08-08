import type { Map as MapLibreMap } from "maplibre-gl";

export type PaintOpacityTarget = {
  layerId: string;
  property: string;
  /** Fully-on opacity for this paint property. */
  visible: number;
};

export type LayerFadeHandle = {
  cancel: () => void;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/**
 * Fade MapLibre paint opacities in/out. Callers should clear expression-based
 * paint props to numbers before fading out.
 */
export function animatePaintOpacities(
  map: MapLibreMap,
  targets: PaintOpacityTarget[],
  show: boolean,
  options?: { durationMs?: number; onDone?: () => void },
): LayerFadeHandle {
  const durationMs = options?.durationMs ?? 280;
  let cancelled = false;
  let raf = 0;

  const apply = (progress: number) => {
    const t = show ? progress : 1 - progress;
    for (const target of targets) {
      if (!map.getLayer(target.layerId)) continue;
      map.setPaintProperty(
        target.layerId,
        target.property,
        target.visible * t,
      );
    }
  };

  const finish = () => {
    if (cancelled) return;
    apply(1);
    if (!show) {
      for (const target of targets) {
        if (!map.getLayer(target.layerId)) continue;
        map.setLayoutProperty(target.layerId, "visibility", "none");
      }
    }
    options?.onDone?.();
  };

  if (show) {
    for (const target of targets) {
      if (!map.getLayer(target.layerId)) continue;
      map.setLayoutProperty(target.layerId, "visibility", "visible");
    }
  }

  if (prefersReducedMotion() || durationMs <= 0) {
    finish();
    return { cancel: () => {} };
  }

  apply(0);
  const start = performance.now();

  const tick = (now: number) => {
    if (cancelled) return;
    const raw = Math.min(1, (now - start) / durationMs);
    apply(easeOutCubic(raw));
    if (raw < 1) {
      raf = requestAnimationFrame(tick);
    } else {
      finish();
    }
  };

  raf = requestAnimationFrame(tick);

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    },
  };
}
