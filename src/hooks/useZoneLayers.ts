"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { profileQueryParams } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import {
  clearZoneFeatureStore,
  getZoneBboxClientCached,
  mergeZoneFeatures,
  setZoneBboxClientCached,
  zoneBboxClientCacheKey,
  zonesForViewport,
} from "@/hooks/zoneBboxCache";
import { viewportMovedEnough, zoneLimitForZoom } from "@/lib/map/viewport";
import {
  useDroneProfileStore,
  type MapBackendLabel,
} from "@/stores/drone-profile";

const DEBOUNCE_MS = 200;

type BboxZoneResponse = GeoJSON.FeatureCollection & {
  meta?: {
    backend?: string;
    dataVersion?: string | null;
    queryMs?: number;
  };
};

const MAP_BACKENDS = new Set<string>([
  "servais",
  "postgis",
  "memory",
  "pansa",
  "aimgis",
  "dipul",
  "geopf",
  "dronezoner",
  "foca",
  "anac",
  "austro",
  "lfv",
  "multi",
]);

function parseMapBackend(value: string | undefined): MapBackendLabel {
  if (value && MAP_BACKENDS.has(value)) {
    return value as Exclude<MapBackendLabel, null>;
  }
  return null;
}

/**
 * Load zone polygons for the current map viewport, filtered by drone profile.
 * Features accumulate in a session store so returning to a region shows zones immediately.
 */
export function useZoneLayers() {
  const weightClass = useDroneProfileStore((s) => s.weightClass);
  const maxAltitudeAgl = useDroneProfileStore((s) => s.maxAltitudeAgl);
  const setMapZoneMeta = useDroneProfileStore((s) => s.setMapZoneMeta);

  const [collection, setCollection] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastBbox = useRef<Bbox | null>(null);
  const lastZoom = useRef(6);
  const lastShownRef = useRef<{ bbox: Bbox; zoom: number } | null>(null);
  const profileKey = `${weightClass}:${maxAltitudeAgl}`;
  const lastProfileKey = useRef(profileKey);

  const showViewport = useCallback((bbox: Bbox) => {
    setCollection(zonesForViewport(bbox));
  }, []);

  const fetchBbox = useCallback(
    async (bbox: Bbox, zoom: number) => {
      lastBbox.current = bbox;
      lastZoom.current = zoom;

      const cacheKey = zoneBboxClientCacheKey(
        bbox,
        weightClass,
        maxAltitudeAgl,
      );
      const cached = getZoneBboxClientCached(cacheKey);
      if (cached) {
        mergeZoneFeatures(cached.features);
        showViewport(bbox);
        lastShownRef.current = { bbox, zoom };
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const params = profileQueryParams(
          { weightClass, maxAltitudeAgl },
          {
            west: bbox.west,
            south: bbox.south,
            east: bbox.east,
            north: bbox.north,
            limit: zoneLimitForZoom(zoom),
          },
        );
        const res = await fetch(`/api/zones/bbox?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as BboxZoneResponse;
        if (data.meta) {
          setMapZoneMeta({
            backend: parseMapBackend(data.meta.backend),
            dataVersion: data.meta.dataVersion ?? null,
            queryMs: data.meta.queryMs ?? null,
          });
        }
        const next = {
          type: "FeatureCollection" as const,
          features: data.features ?? [],
        };
        mergeZoneFeatures(next.features);
        setZoneBboxClientCached(cacheKey, next);
        showViewport(bbox);
        lastShownRef.current = { bbox, zoom };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof TypeError && String(err.message).includes("fetch")) return;
        console.error("[useZoneLayers]", err);
      } finally {
        setLoading(false);
      }
    },
    [maxAltitudeAgl, setMapZoneMeta, showViewport, weightClass],
  );

  const fetchBboxDebounced = useDebouncedCallback(
    (bbox: Bbox, zoom: number) => {
      void fetchBbox(bbox, zoom);
    },
    DEBOUNCE_MS,
  );

  const loadBbox = useCallback(
    (bbox: Bbox, zoom: number) => {
      lastBbox.current = bbox;
      lastZoom.current = zoom;

      const prev = lastShownRef.current;
      const zoomChanged = !prev || Math.abs(prev.zoom - zoom) >= 0.5;
      if (
        !prev ||
        zoomChanged ||
        viewportMovedEnough(prev.bbox, bbox)
      ) {
        showViewport(bbox);
        lastShownRef.current = { bbox, zoom };
      }

      fetchBboxDebounced(bbox, zoom);
    },
    [fetchBboxDebounced, showViewport],
  );

  const loadBboxNow = useMemo(() => fetchBbox, [fetchBbox]);

  useEffect(() => {
    if (lastProfileKey.current !== profileKey) {
      lastProfileKey.current = profileKey;
      clearZoneFeatureStore();
      lastShownRef.current = null;
      if (lastBbox.current) {
        setCollection({ type: "FeatureCollection", features: [] });
      }
    }
    if (lastBbox.current) {
      void loadBboxNow(lastBbox.current, lastZoom.current);
    }
  }, [loadBboxNow, profileKey]);

  return { collection, loading, loadBbox };
}
