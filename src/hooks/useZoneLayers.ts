"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { profileQueryParams } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useDroneProfileStore } from "@/stores/drone-profile";

const DEBOUNCE_MS = 350;

/**
 * Load zone polygons for the current map viewport, filtered by drone profile.
 */
export function useZoneLayers() {
  const weightClass = useDroneProfileStore((s) => s.weightClass);
  const maxAltitudeAgl = useDroneProfileStore((s) => s.maxAltitudeAgl);

  const [collection, setCollection] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastBbox = useRef<Bbox | null>(null);

  const fetchBbox = useCallback(
    async (bbox: Bbox) => {
      lastBbox.current = bbox;
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
          },
        );
        const res = await fetch(`/api/zones/bbox?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        setCollection({
          type: "FeatureCollection",
          features: data.features ?? [],
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("[useZoneLayers]", err);
      } finally {
        setLoading(false);
      }
    },
    [maxAltitudeAgl, weightClass],
  );

  const loadBbox = useDebouncedCallback((bbox: Bbox) => {
    void fetchBbox(bbox);
  }, DEBOUNCE_MS);

  // Stable immediate loader for profile-change refresh
  const loadBboxNow = useMemo(() => fetchBbox, [fetchBbox]);

  useEffect(() => {
    if (lastBbox.current) {
      void loadBboxNow(lastBbox.current);
    }
  }, [loadBboxNow]);

  return { collection, loading, loadBbox };
}
