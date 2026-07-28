"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

/** Anonymous OpenSky is tiny — poll slowly and never auto-fetch tracks. */
const POLL_MS = 45_000;
const RATE_LIMIT_BACKOFF_MS = 10 * 60_000;
const MIN_ZOOM = 7;
const VIEWPORT_DEBOUNCE_MS = 600;
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
  const zoomRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownUntilRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

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
    const bbox = bboxRef.current;
    if (!bbox) {
      scheduleNext(2_000);
      return;
    }

    if (Date.now() < cooldownUntilRef.current) {
      setError("rate_limited");
      scheduleNext(cooldownUntilRef.current - Date.now());
      return;
    }

    if (zoomRef.current < MIN_ZOOM) {
      setCollection(EMPTY);
      setFuturePaths(EMPTY);
      setCount(0);
      setError(null);
      scheduleNext(POLL_MS);
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
      // Don't hammer OpenSky on every pan — wait for debounce + next poll.
      // Only fetch immediately if we have no data yet.
      if (count === 0 && !error) {
        void fetchTraffic();
      }
    },
    [count, error, fetchTraffic],
  );

  const setViewport = useDebouncedCallback(
    (bbox: Bbox, zoom: number) => {
      setViewportImmediate(bbox, zoom);
    },
    VIEWPORT_DEBOUNCE_MS,
  );

  useEffect(() => {
    if (!enabled) {
      setCollection(EMPTY);
      setFuturePaths(EMPTY);
      setCount(0);
      setError(null);
      clearTimer();
      return;
    }

    void fetchTraffic();
    return () => {
      clearTimer();
      abortRef.current?.abort();
    };
  }, [enabled, fetchTraffic]);

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
