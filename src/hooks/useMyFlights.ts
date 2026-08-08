"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Bbox } from "@canifly/middleware";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { viewportMovedEnough } from "@/lib/map/viewport";
import { useAuthStore } from "@/stores/auth";

const DEBOUNCE_MS = 250;

export type FlightsScope = "all" | "mine";

/**
 * Load flight tracks/points for the map viewport.
 * - `all`: every pilot’s flights in the bbox (no auth required)
 * - `mine`: only the signed-in user’s flights
 */
export function useMyFlights(enabled = true, scope: FlightsScope = "all") {
  const user = useAuthStore((s) => s.user);
  const [collection, setCollection] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastBbox = useRef<Bbox | null>(null);
  const enabledRef = useRef(enabled);
  const scopeRef = useRef(scope);
  enabledRef.current = enabled;
  scopeRef.current = scope;

  const fetchBbox = useCallback(
    async (bbox: Bbox) => {
      if (!enabledRef.current) {
        setCollection({ type: "FeatureCollection", features: [] });
        return;
      }
      if (scopeRef.current === "mine" && !user) {
        setCollection({ type: "FeatureCollection", features: [] });
        return;
      }
      lastBbox.current = bbox;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const q = new URLSearchParams({
          west: String(bbox.west),
          south: String(bbox.south),
          east: String(bbox.east),
          north: String(bbox.north),
          limit: "200",
        });
        if (scopeRef.current === "mine") q.set("mine", "1");
        const res = await fetch(`/api/flights/bbox?${q}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        if (!enabledRef.current) return;
        setCollection(data);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
      }
    },
    [user],
  );

  const debounced = useDebouncedCallback((bbox: Bbox) => {
    if (!viewportMovedEnough(lastBbox.current, bbox) && lastBbox.current) {
      return;
    }
    void fetchBbox(bbox);
  }, DEBOUNCE_MS);

  const loadBbox = useCallback(
    (bbox: Bbox) => {
      if (!enabledRef.current) return;
      debounced(bbox);
    },
    [debounced],
  );

  useEffect(() => {
    if (!enabled) {
      abortRef.current?.abort();
      setCollection({ type: "FeatureCollection", features: [] });
      lastBbox.current = null;
      return;
    }
    if (scope === "mine" && !user) {
      abortRef.current?.abort();
      setCollection({ type: "FeatureCollection", features: [] });
      lastBbox.current = null;
      return;
    }
    // Scope / auth changed — force a fresh fetch on next loadBbox.
    lastBbox.current = null;
  }, [user, enabled, scope]);

  return { collection, loadBbox };
}
