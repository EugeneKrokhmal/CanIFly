"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_DRONE_PROFILE,
  type AirspaceStatus,
  type MatchedZone,
  type OperationCategory,
  type WeightClass,
} from "@canifly/middleware";

export type { WeightClass, OperationCategory };

export interface SelectedDrone {
  id: string;
  manufacturer: string;
  name: string;
  label: string;
  uasClass: string | null;
  weightG: number | null;
  maxTakeoffG: number | null;
  weightClass: WeightClass;
  classSource: "easa_label" | "mtom" | "weight" | "default";
}

interface DroneProfileState {
  weightClass: WeightClass;
  operationCategory: OperationCategory;
  maxAltitudeAgl: number;
  selectedDrone: SelectedDrone | null;
  selectedPoint: { lat: number; lng: number } | null;
  mapCameraRequest: {
    lat: number;
    lng: number;
    zoom: number;
    nonce: number;
  } | null;
  status: AirspaceStatus | null;
  summary: string | null;
  zones: MatchedZone[];
  statusLoading: boolean;
  statusError: string | null;
  queryMs: number | null;
  dataVersion: string | null;
  backend: "servais" | "postgis" | "memory" | "pansa" | "multi" | null;
  highlightedZoneId: string | null;
  setWeightClass: (v: WeightClass) => void;
  setMaxAltitudeAgl: (v: number) => void;
  setSelectedDrone: (d: SelectedDrone | null) => void;
  setSelectedPoint: (p: { lat: number; lng: number } | null) => void;
  locateAndFocus: (p: { lat: number; lng: number }, zoom?: number) => void;
  /** Bump to ask MapView's GeolocateControl to show the blue “you are here” dot. */
  geolocateNonce: number;
  /** When true, MapView must not auto-trigger geolocate (deep-link / search focus). */
  suppressGeolocate: boolean;
  requestGeolocate: () => void;
  clearMapCameraRequest: () => void;
  setStatusResult: (payload: {
    status: AirspaceStatus;
    summary: string;
    zones: MatchedZone[];
    queryMs: number | null;
    dataVersion: string | null;
    backend: "servais" | "postgis" | "memory" | "pansa" | "multi" | null;
  }) => void;
  setStatusLoading: (v: boolean) => void;
  setStatusError: (v: string | null) => void;
  setHighlightedZoneId: (id: string | null) => void;
  clearStatus: () => void;
}

export const useDroneProfileStore = create<DroneProfileState>()(
  persist(
    (set) => ({
      weightClass: DEFAULT_DRONE_PROFILE.weightClass,
      operationCategory: "open",
      maxAltitudeAgl: DEFAULT_DRONE_PROFILE.maxAltitudeAgl,
      selectedDrone: null,
      selectedPoint: null,
      mapCameraRequest: null,
      geolocateNonce: 0,
      suppressGeolocate: false,
      status: null,
      summary: null,
      zones: [],
      statusLoading: false,
      statusError: null,
      queryMs: null,
      dataVersion: null,
      backend: null,
      highlightedZoneId: null,
      setWeightClass: (weightClass) =>
        set((s) => ({
          weightClass,
          selectedDrone:
            s.selectedDrone && s.selectedDrone.weightClass !== weightClass
              ? { ...s.selectedDrone, weightClass }
              : s.selectedDrone,
        })),
      setMaxAltitudeAgl: (maxAltitudeAgl) => set({ maxAltitudeAgl }),
      setSelectedDrone: (selectedDrone) =>
        set({
          selectedDrone,
          ...(selectedDrone ? { weightClass: selectedDrone.weightClass } : {}),
        }),
      setSelectedPoint: (selectedPoint) =>
        set({
          selectedPoint,
          // Drop previous tap's verdict immediately so UI cannot flash the wrong status.
          status: null,
          summary: null,
          zones: [],
          statusError: null,
          statusLoading: selectedPoint != null,
          queryMs: null,
          highlightedZoneId: null,
        }),
      locateAndFocus: (p, zoom = 14) =>
        set((s) => ({
          selectedPoint: p,
          suppressGeolocate: true,
          status: null,
          summary: null,
          zones: [],
          statusError: null,
          statusLoading: true,
          queryMs: null,
          highlightedZoneId: null,
          mapCameraRequest: {
            lat: p.lat,
            lng: p.lng,
            zoom,
            nonce: (s.mapCameraRequest?.nonce ?? 0) + 1,
          },
        })),
      requestGeolocate: () =>
        set((s) => ({
          suppressGeolocate: false,
          geolocateNonce: s.geolocateNonce + 1,
        })),
      clearMapCameraRequest: () => set({ mapCameraRequest: null }),
      setStatusResult: (payload) =>
        set({
          status: payload.status,
          summary: payload.summary,
          zones: payload.zones,
          queryMs: payload.queryMs,
          dataVersion: payload.dataVersion,
          backend: payload.backend,
          statusLoading: false,
          statusError: null,
          highlightedZoneId: null,
        }),
      setStatusLoading: (statusLoading) => set({ statusLoading }),
      setStatusError: (statusError) =>
        set({ statusError, statusLoading: false }),
      setHighlightedZoneId: (highlightedZoneId) => set({ highlightedZoneId }),
      clearStatus: () =>
        set({
          status: null,
          summary: null,
          zones: [],
          statusError: null,
          queryMs: null,
          highlightedZoneId: null,
        }),
    }),
    {
      name: "canifly-drone-profile",
      partialize: (state) => ({
        weightClass: state.weightClass,
        operationCategory: "open" as const,
        maxAltitudeAgl: Math.min(state.maxAltitudeAgl, 120),
        selectedDrone: state.selectedDrone,
      }),
    },
  ),
);
