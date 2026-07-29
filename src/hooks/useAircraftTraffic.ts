"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

/**
 * Live ADS-B positions + estimated future path.
 * Uses community feeds (adsb.lol / airplanes.live / adsb.fi) via the API.
 * Past tracks load only when the user clicks an aircraft (MapView → /api/traffic/track).
 */
const POLL_MS = 45_000;
/** Never hit the API more often than this, even on big pans. */
const MIN_FETCH_GAP_MS = 18_000;
const RATE_LIMIT_BACKOFF_MS = 10 * 60_000;
/** Match default map zoom so traffic shows on first paint (Spain overview). */
const MIN_ZOOM = 6;
const VIEWPORT_DEBOUNCE_MS = 800;
const TICK_MS = 2_000;
/** Cap how far we coast after the last ADS-B snap. */
const MAX_COAST_S = 150;
const FUTURE_HORIZON_S = 10 * 60;
const EMPTY: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

type LngLat = [number, number];

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

function buildFutureCollection(
  aircraft: GeoJSON.Feature[],
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const f of aircraft) {
    if (f.geometry.type !== "Point") continue;
    const p = f.properties ?? {};
    if (p.onGround) continue;
    const [lng, lat] = f.geometry.coordinates as LngLat;
    const track =
      typeof p.trackDeg === "number" && Number.isFinite(p.trackDeg)
        ? p.trackDeg
        : null;
    const vel =
      typeof p.velocityMs === "number" && Number.isFinite(p.velocityMs)
        ? p.velocityMs
        : 0;
    if (track == null || vel < 5) continue;

    const ahead = destination(
      lng,
      lat,
      track,
      Math.min(vel * FUTURE_HORIZON_S, 120_000),
    );
    features.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[lng, lat], ahead] },
      properties: {
        icao24: String(p.icao24 ?? ""),
        callsign: p.callsign ?? null,
        kind: "future",
        horizonMin: FUTURE_HORIZON_S / 60,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

/** Extrapolate airborne positions along heading × speed since snapshot. */
function coastAircraft(
  snapshot: GeoJSON.Feature[],
  elapsedSec: number,
): GeoJSON.Feature[] {
  const dt = Math.min(Math.max(elapsedSec, 0), MAX_COAST_S);
  if (dt < 0.5) return snapshot;

  return snapshot.map((f) => {
    if (f.geometry.type !== "Point") return f;
    const p = f.properties ?? {};
    if (p.onGround) return f;
    const [lng, lat] = f.geometry.coordinates as LngLat;
    const track =
      typeof p.trackDeg === "number" && Number.isFinite(p.trackDeg)
        ? p.trackDeg
        : null;
    const vel =
      typeof p.velocityMs === "number" && Number.isFinite(p.velocityMs)
        ? p.velocityMs
        : 0;
    if (track == null || vel < 5) return f;

    const next = destination(lng, lat, track, vel * dt);
    const alt =
      typeof p.altitudeM === "number" &&
      typeof p.verticalRateMs === "number" &&
      Number.isFinite(p.verticalRateMs)
        ? p.altitudeM + p.verticalRateMs * dt
        : p.altitudeM;

    return {
      ...f,
      geometry: { type: "Point", coordinates: next },
      properties: { ...p, altitudeM: alt },
    };
  });
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
 * Live ADS-B positions + estimated future path.
 * Past tracks load only when the user clicks an aircraft (MapView → /api/traffic/track).
 */
export function useAircraftTraffic(enabled: boolean) {
  const [collection, setCollection] =
    useState<GeoJSON.FeatureCollection>(EMPTY);
  const [futurePaths, setFuturePaths] =
    useState<GeoJSON.FeatureCollection>(EMPTY);
  const [count, setCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bboxRef = useRef<Bbox | null>(null);
  const fetchedBboxRef = useRef<Bbox | null>(null);
  const zoomRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cooldownUntilRef = useRef(0);
  const lastFetchAtRef = useRef(0);
  const snapshotRef = useRef<GeoJSON.Feature[]>([]);
  const snapshotAtRef = useRef(0);
  const hasDataRef = useRef(false);
  const forceFetchRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const publishCoast = useCallback(() => {
    if (!snapshotRef.current.length || !snapshotAtRef.current) return;
    const elapsed = (Date.now() - snapshotAtRef.current) / 1000;
    const features = coastAircraft(snapshotRef.current, elapsed);
    setCollection({ type: "FeatureCollection", features });
    setFuturePaths(buildFutureCollection(features));
    setCount(features.length);
  }, []);

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
      snapshotRef.current = [];
      snapshotAtRef.current = 0;
      hasDataRef.current = false;
      setCollection(EMPTY);
      setFuturePaths(EMPTY);
      setCount(0);
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

      const features = data.features ?? [];
      snapshotRef.current = features;
      snapshotAtRef.current = Date.now();
      hasDataRef.current = features.length > 0;
      setCollection({ type: "FeatureCollection", features });
      setCount(data.meta?.count ?? features.length);
      setUpdatedAt(Date.now());
      setError(data.meta?.error ?? null);
      setFuturePaths(buildFutureCollection(features));
      scheduleNext(POLL_MS);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("unavailable");
      scheduleNext(POLL_MS);
    }
  }, [enabled, scheduleNext]);

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
          // Drop off-screen leftovers immediately; refill for the new view.
          forceFetchRef.current = true;
          snapshotRef.current = [];
          snapshotAtRef.current = 0;
          hasDataRef.current = false;
          setCollection(EMPTY);
          setFuturePaths(EMPTY);
          setCount(0);
        }
        void fetchTraffic();
      }
    },
    [enabled, fetchTraffic],
  );

  const setViewport = useDebouncedCallback(
    (bbox: Bbox, zoom: number) => {
      setViewportImmediate(bbox, zoom);
    },
    VIEWPORT_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!enabled) {
      snapshotRef.current = [];
      snapshotAtRef.current = 0;
      hasDataRef.current = false;
      setCollection(EMPTY);
      setFuturePaths(EMPTY);
      setCount(0);
      setError(null);
      clearTimer();
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    void fetchTraffic();
    tickRef.current = setInterval(publishCoast, TICK_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const age = Date.now() - lastFetchAtRef.current;
        if (!lastFetchAtRef.current || age > MIN_FETCH_GAP_MS) {
          void fetchTraffic();
        } else {
          publishCoast();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearTimer();
      abortRef.current?.abort();
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, fetchTraffic, publishCoast]);

  return {
    collection,
    /** Wakes/past paths only from clicked aircraft (MapView track layer). */
    pastPaths: EMPTY,
    futurePaths,
    count,
    tracksLoaded: 0,
    updatedAt,
    error,
    setViewport,
    minZoom: MIN_ZOOM,
  };
}
