"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

/**
 * Live ADS-B positions with smooth rAF dead reckoning between snaps.
 * Uses community feeds (adsb.lol / airplanes.live / adsb.fi) via the API.
 */
const POLL_MS = 15_000;
const MIN_FETCH_GAP_MS = 8_000;
const RATE_LIMIT_BACKOFF_MS = 10 * 60_000;
const MIN_ZOOM = 6;
const VIEWPORT_DEBOUNCE_MS = 600;
/** Cap coasting — prefer a fresh poll over long extrapolation. */
const MAX_COAST_S = 25;
/** Soft catch-up when a new ADS-B fix arrives (avoids teleport). */
const BLEND_MS = 900;
/** MapLibre setData cadence — motion stays at rAF, GPU updates ~10 Hz. */
const MAP_PUBLISH_MS = 100;

const EMPTY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

type LngLat = [number, number];

type MotionPlane = {
  icao24: string;
  props: GeoJSON.GeoJsonProperties;
  /** Last ADS-B fix (lng/lat). */
  fixLng: number;
  fixLat: number;
  fixAlt: number | null;
  trackDeg: number;
  velocityMs: number;
  verticalRateMs: number;
  seenPosSec: number;
  /** Wall clock when this fix was applied. */
  fixAt: number;
  /** Displayed pose (smooth). */
  lng: number;
  lat: number;
  alt: number | null;
  heading: number;
  /** Optional blend from previous display toward the new coasted path. */
  blendFromLng?: number;
  blendFromLat?: number;
  blendFromHeading?: number;
  blendFromAlt?: number | null;
  blendT0?: number;
};

function destination(
  lng: number,
  lat: number,
  bearingDeg: number,
  distanceM: number,
): LngLat {
  const R = 6371000;
  const δ = distanceM / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ),
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
    );
  return [((λ2 * 180) / Math.PI + 540) % 360 - 180, (φ2 * 180) / Math.PI];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const d = ((b - a + 540) % 360) - 180;
  return (a + d * t + 360) % 360;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function coastFromFix(
  plane: MotionPlane,
  now: number,
): { lng: number; lat: number; alt: number | null; heading: number } {
  const elapsed =
    (now - plane.fixAt) / 1000 + Math.max(0, plane.seenPosSec);
  const dt = Math.min(Math.max(elapsed, 0), MAX_COAST_S);
  const heading = plane.trackDeg;
  if (plane.velocityMs < 5 || dt < 0.05) {
    return {
      lng: plane.fixLng,
      lat: plane.fixLat,
      alt: plane.fixAlt,
      heading,
    };
  }
  const [lng, lat] = destination(
    plane.fixLng,
    plane.fixLat,
    heading,
    plane.velocityMs * dt,
  );
  const alt =
    plane.fixAlt != null && Number.isFinite(plane.verticalRateMs)
      ? plane.fixAlt + plane.verticalRateMs * dt
      : plane.fixAlt;
  return { lng, lat, alt, heading };
}

function planesToCollection(planes: MotionPlane[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: planes.map((plane) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [plane.lng, plane.lat],
      },
      properties: {
        ...plane.props,
        altitudeM: plane.alt,
        trackDeg: plane.heading,
        velocityMs: plane.velocityMs,
        verticalRateMs: plane.verticalRateMs,
      },
    })),
  };
}

function featureToMotion(
  f: GeoJSON.Feature,
  now: number,
  prev?: MotionPlane,
): MotionPlane | null {
  if (f.geometry.type !== "Point") return null;
  const p = f.properties ?? {};
  const icao24 = String(p.icao24 ?? "");
  if (!icao24) return null;
  const [fixLng, fixLat] = f.geometry.coordinates as LngLat;
  if (!Number.isFinite(fixLng) || !Number.isFinite(fixLat)) return null;

  const trackDeg =
    typeof p.trackDeg === "number" && Number.isFinite(p.trackDeg)
      ? p.trackDeg
      : 0;
  const velocityMs =
    typeof p.velocityMs === "number" && Number.isFinite(p.velocityMs)
      ? p.velocityMs
      : 0;
  const verticalRateMs =
    typeof p.verticalRateMs === "number" && Number.isFinite(p.verticalRateMs)
      ? p.verticalRateMs
      : 0;
  const seenPosSec =
    typeof p.seenPosSec === "number" && Number.isFinite(p.seenPosSec)
      ? Math.max(0, p.seenPosSec)
      : 0;
  const fixAlt =
    typeof p.altitudeM === "number" && Number.isFinite(p.altitudeM)
      ? p.altitudeM
      : null;

  const base: MotionPlane = {
    icao24,
    props: p,
    fixLng,
    fixLat,
    fixAlt,
    trackDeg,
    velocityMs,
    verticalRateMs,
    seenPosSec,
    fixAt: now,
    lng: fixLng,
    lat: fixLat,
    alt: fixAlt,
    heading: trackDeg,
  };

  // Seed display from coasted fix so age is respected immediately.
  const coasted = coastFromFix(base, now);
  base.lng = coasted.lng;
  base.lat = coasted.lat;
  base.alt = coasted.alt;
  base.heading = coasted.heading;

  if (prev) {
    const jumpM = haversineM(prev.lng, prev.lat, base.lng, base.lat);
    // Soft blend only when the jump would be noticeable.
    if (jumpM > 40) {
      base.blendFromLng = prev.lng;
      base.blendFromLat = prev.lat;
      base.blendFromHeading = prev.heading;
      base.blendFromAlt = prev.alt;
      base.blendT0 = now;
      base.lng = prev.lng;
      base.lat = prev.lat;
      base.alt = prev.alt;
      base.heading = prev.heading;
    }
  }

  return base;
}

function haversineM(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

function advancePlanes(planes: Map<string, MotionPlane>, now: number): void {
  for (const plane of planes.values()) {
    const target = coastFromFix(plane, now);
    if (
      plane.blendT0 != null &&
      plane.blendFromLng != null &&
      plane.blendFromLat != null
    ) {
      const t = Math.min(1, (now - plane.blendT0) / BLEND_MS);
      const e = easeOutCubic(t);
      plane.lng = lerp(plane.blendFromLng, target.lng, e);
      plane.lat = lerp(plane.blendFromLat, target.lat, e);
      plane.heading = lerpAngle(
        plane.blendFromHeading ?? target.heading,
        target.heading,
        e,
      );
      plane.alt =
        plane.blendFromAlt != null && target.alt != null
          ? lerp(plane.blendFromAlt, target.alt, e)
          : target.alt ?? plane.blendFromAlt ?? null;
      if (t >= 1) {
        plane.blendT0 = undefined;
        plane.blendFromLng = undefined;
        plane.blendFromLat = undefined;
        plane.blendFromHeading = undefined;
        plane.blendFromAlt = undefined;
      }
    } else {
      plane.lng = target.lng;
      plane.lat = target.lat;
      plane.alt = target.alt;
      plane.heading = target.heading;
    }
  }
}

function viewportMovedEnough(prev: Bbox | null, next: Bbox): boolean {
  if (!prev) return true;
  const pw = prev.east - prev.west;
  const ph = prev.north - prev.south;
  const nw = next.east - next.west;
  const nh = next.north - next.south;
  const cxP = (prev.west + prev.east) / 2;
  const cyP = (prev.south + prev.north) / 2;
  const cxN = (next.west + next.east) / 2;
  const cyN = (next.south + next.north) / 2;
  return (
    Math.abs(cxP - cxN) > pw * 0.4 ||
    Math.abs(cyP - cyN) > ph * 0.4 ||
    Math.abs(pw - nw) / Math.max(pw, 1e-6) > 0.45 ||
    Math.abs(ph - nh) / Math.max(ph, 1e-6) > 0.45
  );
}

/**
 * Live ADS-B positions + smooth motion between polls.
 */
export function useAircraftTraffic(enabled: boolean) {
  const [collection, setCollection] =
    useState<GeoJSON.FeatureCollection>(EMPTY);
  const [count, setCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bboxRef = useRef<Bbox | null>(null);
  const fetchedBboxRef = useRef<Bbox | null>(null);
  const zoomRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const lastFetchAtRef = useRef(0);
  const planesRef = useRef<Map<string, MotionPlane>>(new Map());
  const hasDataRef = useRef(false);
  const forceFetchRef = useRef(false);
  const lastMapPublishAtRef = useRef(0);
  const liveListenersRef = useRef(
    new Set<(fc: GeoJSON.FeatureCollection) => void>(),
  );

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const publishLive = useCallback((fc: GeoJSON.FeatureCollection) => {
    for (const listener of liveListenersRef.current) {
      listener(fc);
    }
  }, []);

  const clearPlanes = useCallback(() => {
    planesRef.current.clear();
    hasDataRef.current = false;
    setCollection(EMPTY);
    setCount(0);
    publishLive(EMPTY);
  }, [publishLive]);

  const subscribeLive = useCallback(
    (listener: (fc: GeoJSON.FeatureCollection) => void) => {
      liveListenersRef.current.add(listener);
      // Push current pose immediately so the map isn't empty until next frame.
      if (planesRef.current.size > 0) {
        listener(planesToCollection([...planesRef.current.values()]));
      }
      return () => {
        liveListenersRef.current.delete(listener);
      };
    },
    [],
  );

  const scheduleNext = useCallback(
    (delayMs: number) => {
      clearTimer();
      if (!enabled) return;
      timerRef.current = setTimeout(() => {
        void fetchTrafficRef.current();
      }, delayMs);
    },
    [enabled],
  );

  const fetchTrafficRef = useRef<() => Promise<void>>(async () => undefined);

  const fetchTraffic = useCallback(async () => {
    if (!enabled) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      scheduleNext(POLL_MS);
      return;
    }

    const bbox = bboxRef.current;
    if (!bbox) {
      scheduleNext(5_000);
      return;
    }

    if (Date.now() < cooldownUntilRef.current) {
      setError("rate_limited");
      scheduleNext(cooldownUntilRef.current - Date.now());
      return;
    }

    if (zoomRef.current < MIN_ZOOM) {
      clearPlanes();
      setError(null);
      scheduleNext(POLL_MS);
      return;
    }

    const sinceLast = Date.now() - lastFetchAtRef.current;
    const force = forceFetchRef.current;
    forceFetchRef.current = false;
    if (!force && lastFetchAtRef.current > 0 && sinceLast < MIN_FETCH_GAP_MS) {
      scheduleNext(MIN_FETCH_GAP_MS - sinceLast);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams({
        west: String(bbox.west),
        south: String(bbox.south),
        east: String(bbox.east),
        north: String(bbox.north),
      });
      const res = await fetch(`/api/traffic/aircraft?${params}`, {
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        features?: GeoJSON.Feature[];
        meta?: { count?: number; error?: string; retryAfterMs?: number };
      };

      lastFetchAtRef.current = Date.now();
      fetchedBboxRef.current = bbox;

      if (data.meta?.error === "rate_limited") {
        const wait = Math.max(
          data.meta.retryAfterMs ?? RATE_LIMIT_BACKOFF_MS,
          RATE_LIMIT_BACKOFF_MS,
        );
        cooldownUntilRef.current = Date.now() + wait;
        setError("rate_limited");
        scheduleNext(wait);
        return;
      }

      const now = Date.now();
      const next = new Map<string, MotionPlane>();
      const prev = planesRef.current;
      for (const f of data.features ?? []) {
        const motion = featureToMotion(f, now, prev.get(String(f.properties?.icao24 ?? "")));
        if (motion) next.set(motion.icao24, motion);
      }
      planesRef.current = next;
      hasDataRef.current = next.size > 0;

      const fc = planesToCollection([...next.values()]);
      setCollection(fc);
      setCount(data.meta?.count ?? next.size);
      setUpdatedAt(now);
      setError(data.meta?.error ?? null);
      publishLive(fc);
      scheduleNext(POLL_MS);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("unavailable");
      scheduleNext(POLL_MS);
    }
  }, [clearPlanes, enabled, publishLive, scheduleNext]);

  fetchTrafficRef.current = fetchTraffic;

  const setViewportImmediate = useCallback(
    (bbox: Bbox, zoom: number) => {
      bboxRef.current = bbox;
      zoomRef.current = zoom;

      if (!enabled) return;
      if (zoom < MIN_ZOOM) return;

      const empty = !hasDataRef.current;
      const moved = viewportMovedEnough(fetchedBboxRef.current, bbox);
      const stale =
        !lastFetchAtRef.current ||
        Date.now() - lastFetchAtRef.current > POLL_MS * 0.75;

      if (empty || moved || stale) {
        if (moved) {
          forceFetchRef.current = true;
          clearPlanes();
        }
        void fetchTraffic();
      }
    },
    [clearPlanes, enabled, fetchTraffic],
  );

  const setViewport = useDebouncedCallback(
    (bbox: Bbox, zoom: number) => {
      setViewportImmediate(bbox, zoom);
    },
    VIEWPORT_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!enabled) {
      clearPlanes();
      setError(null);
      clearTimer();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    void fetchTraffic();

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      const planes = planesRef.current;
      if (planes.size === 0) return;

      const now = Date.now();
      advancePlanes(planes, now);
      const list = [...planes.values()];

      if (now - lastMapPublishAtRef.current >= MAP_PUBLISH_MS) {
        lastMapPublishAtRef.current = now;
        publishLive(planesToCollection(list));
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const age = Date.now() - lastFetchAtRef.current;
        if (!lastFetchAtRef.current || age > MIN_FETCH_GAP_MS) {
          void fetchTraffic();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      abortRef.current?.abort();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearPlanes, enabled, fetchTraffic, publishLive]);

  return {
    collection,
    count,
    updatedAt,
    error,
    setViewport,
    subscribeLive,
    minZoom: MIN_ZOOM,
  };
}
