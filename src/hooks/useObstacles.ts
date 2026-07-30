"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useAuthStore } from "@/stores/auth";
import { useObstaclesStore } from "@/stores/obstacles";

const DEBOUNCE_MS = 200;

export function useObstacles() {
  const refreshToken = useObstaclesStore((s) => s.refreshToken);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [collection, setCollection] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastBbox = useRef<Bbox | null>(null);

  const fetchBbox = useCallback(async (bbox: Bbox) => {
    lastBbox.current = bbox;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        west: String(bbox.west),
        south: String(bbox.south),
        east: String(bbox.east),
        north: String(bbox.north),
      });
      const res = await fetch(`/api/obstacles/bbox?${params}`, {
        signal: controller.signal,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GeoJSON.FeatureCollection;
      setCollection({
        type: "FeatureCollection",
        features: data.features ?? [],
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof TypeError && String(err.message).includes("fetch")) return;
      console.error("[useObstacles]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBbox = useDebouncedCallback((bbox: Bbox) => {
    void fetchBbox(bbox);
  }, DEBOUNCE_MS);

  useEffect(() => {
    if (lastBbox.current) {
      void fetchBbox(lastBbox.current);
    }
  }, [fetchBbox, refreshToken, userId]);

  return { collection, loading, loadBbox };
}
