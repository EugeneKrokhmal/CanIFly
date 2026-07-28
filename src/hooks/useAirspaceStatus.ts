"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDroneProfileStore } from "@/stores/drone-profile";
import type { AirspaceStatus, MatchedZone } from "@canifly/middleware";

interface StatusApiResponse {
  status: AirspaceStatus;
  summary: string;
  zones: MatchedZone[];
  error?: string;
  meta?: {
    queryMs?: number;
    dataVersion?: string | null;
    backend?: "servais" | "postgis" | "memory";
  };
}

/**
 * Debounced airspace status fetch for map taps.
 * Re-runs when the drone profile changes while a point is selected.
 */
export function useAirspaceStatus() {
  const selectedPoint = useDroneProfileStore((s) => s.selectedPoint);
  const weightClass = useDroneProfileStore((s) => s.weightClass);
  const operationCategory = "open" as const;
  const maxAltitudeAgl = useDroneProfileStore((s) => s.maxAltitudeAgl);
  const setStatusLoading = useDroneProfileStore((s) => s.setStatusLoading);
  const setStatusResult = useDroneProfileStore((s) => s.setStatusResult);
  const setStatusError = useDroneProfileStore((s) => s.setStatusError);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatus = useCallback(
    async (lat: number, lng: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatusLoading(true);

      try {
        const params = new URLSearchParams({
          lat: String(lat),
          lng: String(lng),
          altitudeAgl: String(maxAltitudeAgl),
          weightClass,
          operationCategory,
        });
        const res = await fetch(`/api/airspace/status?${params}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as StatusApiResponse;
        if (!res.ok && !data.status) {
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        setStatusResult({
          status: data.status,
          summary: data.summary,
          zones: data.zones ?? [],
          queryMs: data.meta?.queryMs ?? null,
          dataVersion: data.meta?.dataVersion ?? null,
          backend: data.meta?.backend ?? null,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatusError(
          err instanceof Error ? err.message : "Failed to evaluate airspace",
        );
      }
    },
    [
      maxAltitudeAgl,
      weightClass,
      operationCategory,
      setStatusLoading,
      setStatusResult,
      setStatusError,
    ],
  );

  useEffect(() => {
    if (!selectedPoint) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void fetchStatus(selectedPoint.lat, selectedPoint.lng);
    }, 150);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [selectedPoint, fetchStatus]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { refetch: fetchStatus };
}
