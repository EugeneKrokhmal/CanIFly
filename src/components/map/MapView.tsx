"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  DEFAULT_ZOOM,
  ENAIRE_ZONE_STYLE,
  SPAIN_CENTER,
  obstacleLabel,
  pinKindLabel,
  type ObstacleType,
  type PinKind,
} from "@canifly/middleware";
import { useLocale, useTranslations } from "next-intl";
import { aircraftPopupHtml, airspacePopupHtml, obstaclePopupHtml } from "@/lib/map/html";
import {
  addObstacleImages,
  obstacleIconImageExpression,
} from "@/lib/map/obstacle-icons";
import { MapAddPinFab, MapAddPinSheet } from "@/components/map/MapAddPinSheet";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { useAuthStore } from "@/stores/auth";
import { useObstaclesStore } from "@/stores/obstacles";
import { useZoneLayers } from "@/hooks/useZoneLayers";
import { useObstacles } from "@/hooks/useObstacles";
import { useAircraftTraffic } from "@/hooks/useAircraftTraffic";

const SOURCE_ID = "uas-zones";
const FILL_LAYER = "uas-zones-fill";
const LINE_LAYER = "uas-zones-outline";
const HIGHLIGHT_FILL = "uas-zones-highlight-fill";
const HIGHLIGHT_LINE = "uas-zones-highlight-line";

const OBSTACLE_SOURCE = "obstacles";
const OBSTACLE_ICON = "obstacles-icon";
const OBSTACLE_LABEL = "obstacles-label";

const AC_SOURCE = "aircraft";
const AC_ICON = "aircraft-icon";
const AC_LABEL = "aircraft-label";
const TRACK_SOURCE = "aircraft-track";
const TRACK_LINE = "aircraft-track-line";
const TRACK_GLOW = "aircraft-track-glow";
const WAKE_SOURCE = "aircraft-wakes";
const WAKE_LINE = "aircraft-wake-line";
const FUTURE_SOURCE = "aircraft-future";
const FUTURE_LINE = "aircraft-future-line";

const PLANE_ICON_AIR = "plane-air";
const PLANE_ICON_GND = "plane-gnd";

function createPendingPinEl(kind: PinKind = "obstacle"): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.borderRadius = "50%";
  el.style.background = kind === "fly_spot" ? "#0d7a4f" : "#ff385c";
  el.style.border = "3px solid #fff";
  el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
  return el;
}

/** Selected takeoff / query point — compact pin (no letter badge). */
function createSelectionPinEl(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "as-selection-pin";
  el.setAttribute("aria-label", "Selected point");
  el.style.cssText = [
    "width:22px",
    "height:22px",
    "border-radius:50%",
    "background:#ff385c",
    "border:3px solid #fff",
    "box-shadow:0 2px 10px rgba(0,0,0,0.35)",
    "pointer-events:none",
  ].join(";");
  return el;
}

/** Top-down jet silhouette pointing north (0°) for icon-rotate = track. */
function createPlaneIconImageData(
  fill: string,
  stroke = "#ffffff",
  size = 64,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(size, size);

  const s = size / 64;
  ctx.clearRect(0, 0, size, size);
  ctx.translate(size / 2, size / 2);
  ctx.scale(s, s);

  ctx.beginPath();
  // nose → left wing → left engine → left wing root → tail left → tip → tail right → …
  ctx.moveTo(0, -26);
  ctx.lineTo(5, -10);
  ctx.lineTo(22, 2);
  ctx.lineTo(22, 7);
  ctx.lineTo(5, 2);
  ctx.lineTo(4, 14);
  ctx.lineTo(12, 20);
  ctx.lineTo(12, 24);
  ctx.lineTo(0, 18);
  ctx.lineTo(-12, 24);
  ctx.lineTo(-12, 20);
  ctx.lineTo(-4, 14);
  ctx.lineTo(-5, 2);
  ctx.lineTo(-22, 7);
  ctx.lineTo(-22, 2);
  ctx.lineTo(-5, -10);
  ctx.closePath();

  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
}

function addPlaneImages(map: maplibregl.Map) {
  if (!map.hasImage(PLANE_ICON_AIR)) {
    map.addImage(
      PLANE_ICON_AIR,
      createPlaneIconImageData("#222222", "#ffffff"),
      { pixelRatio: 2 },
    );
  }
  if (!map.hasImage(PLANE_ICON_GND)) {
    map.addImage(
      PLANE_ICON_GND,
      createPlaneIconImageData("#717171", "#ffffff"),
      { pixelRatio: 2 },
    );
  }
}

function stylePinEl(
  el: HTMLDivElement,
  opts: { size: number; bg: string; fontSize: number },
) {
  el.style.cssText = [
    "display:grid",
    "place-items:center",
    `width:${opts.size}px`,
    `height:${opts.size}px`,
    "border-radius:999px",
    `background:${opts.bg}`,
    "color:#fff",
    `font-size:${opts.fontSize}px`,
    "font-weight:700",
    "border:2px solid #fff",
    "box-shadow:0 2px 8px rgba(0,0,0,0.25)",
    "cursor:pointer",
    "pointer-events:auto",
  ].join(";");
}

function createNumberPinEl(n: number): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "as-pin";
  stylePinEl(el, { size: 28, bg: "#222222", fontSize: 11 });
  el.textContent = String(n).padStart(2, "0");
  return el;
}

function approxCentroid(
  geom: GeoJSON.Geometry | null | undefined,
): [number, number] | null {
  if (!geom) return null;
  let ring: number[][] | undefined;
  if (geom.type === "Polygon") {
    ring = geom.coordinates[0];
  } else if (geom.type === "MultiPolygon") {
    ring = geom.coordinates[0]?.[0];
  }
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (const [lng, lat] of ring) {
    sx += lng;
    sy += lat;
    count += 1;
  }
  if (count === 0) return null;
  return [sx / count, sy / count];
}

function formatAlt(m: unknown): string {
  if (typeof m !== "number" || !Number.isFinite(m)) return "—";
  return `${Math.round(m)} m / ${Math.round(m * 3.28084)} ft`;
}

function formatSpeed(ms: unknown): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  return `${Math.round(ms * 1.94384)} kt`;
}

interface MapViewProps {
  className?: string;
}

export function MapView({ className }: MapViewProps) {
  const locale = useLocale() as "es" | "en";
  const tMap = useTranslations("map");
  const localeRef = useRef(locale);
  const obstacleFallbackRef = useRef(tMap("obstacleFallback"));
  localeRef.current = locale;
  obstacleFallbackRef.current = tMap("obstacleFallback");

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const selectionMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pendingMarkerRef = useRef<maplibregl.Marker | null>(null);
  const zoneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const geolocateControlRef = useRef<maplibregl.GeolocateControl | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const statusPopupActiveRef = useRef(false);
  const trackAbortRef = useRef<AbortController | null>(null);
  const selectedIcaoRef = useRef<string | null>(null);

  const [trafficOn, setTrafficOn] = useState(true);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [trackLabel, setTrackLabel] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const setSelectedPoint = useDroneProfileStore((s) => s.setSelectedPoint);
  const selectedPoint = useDroneProfileStore((s) => s.selectedPoint);
  const locateAndFocus = useDroneProfileStore((s) => s.locateAndFocus);
  const geolocateNonce = useDroneProfileStore((s) => s.geolocateNonce);
  const suppressGeolocate = useDroneProfileStore((s) => s.suppressGeolocate);
  const mapCameraRequest = useDroneProfileStore((s) => s.mapCameraRequest);
  const clearMapCameraRequest = useDroneProfileStore(
    (s) => s.clearMapCameraRequest,
  );
  const zones = useDroneProfileStore((s) => s.zones);
  const highlightedZoneId = useDroneProfileStore((s) => s.highlightedZoneId);
  const status = useDroneProfileStore((s) => s.status);
  const summary = useDroneProfileStore((s) => s.summary);
  const statusLoading = useDroneProfileStore((s) => s.statusLoading);
  const statusError = useDroneProfileStore((s) => s.statusError);
  const placementMode = useObstaclesStore((s) => s.placementMode);
  const pinKind = useObstaclesStore((s) => s.kind);
  const pendingPoint = useObstaclesStore((s) => s.pendingPoint);
  const setPendingPoint = useObstaclesStore((s) => s.setPendingPoint);
  const deleteObstacle = useObstaclesStore((s) => s.deleteObstacle);
  const voteObstacle = useObstaclesStore((s) => s.voteObstacle);
  const authUser = useAuthStore((s) => s.user);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const { collection, loadBbox } = useZoneLayers();
  const { collection: obstacles, loadBbox: loadObstaclesBbox } = useObstacles();
  const {
    collection: aircraft,
    pastPaths,
    futurePaths,
    count: aircraftCount,
    error: trafficError,
    setViewport,
    minZoom,
  } = useAircraftTraffic(trafficOn);

  const loadBboxRef = useRef(loadBbox);
  const loadObstaclesBboxRef = useRef(loadObstaclesBbox);
  const setViewportRef = useRef(setViewport);
  const locateAndFocusRef = useRef(locateAndFocus);
  const placementModeRef = useRef(placementMode);
  const setPendingPointRef = useRef(setPendingPoint);
  const authUserRef = useRef(authUser);
  const deleteObstacleRef = useRef(deleteObstacle);
  const voteObstacleRef = useRef(voteObstacle);
  const setAuthModalOpenRef = useRef(setAuthModalOpen);
  loadBboxRef.current = loadBbox;
  loadObstaclesBboxRef.current = loadObstaclesBbox;
  setViewportRef.current = setViewport;
  locateAndFocusRef.current = locateAndFocus;
  placementModeRef.current = placementMode;
  setPendingPointRef.current = setPendingPoint;
  authUserRef.current = authUser;
  deleteObstacleRef.current = deleteObstacle;
  voteObstacleRef.current = voteObstacle;
  setAuthModalOpenRef.current = setAuthModalOpen;

  const clearTrack = () => {
    trackAbortRef.current?.abort();
    selectedIcaoRef.current = null;
    setTrackLabel(null);
    const map = mapRef.current;
    const source = map?.getSource(TRACK_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;
    source?.setData({ type: "FeatureCollection", features: [] });
  };

  const loadTrack = async (icao24: string, callsign: string) => {
    trackAbortRef.current?.abort();
    const controller = new AbortController();
    trackAbortRef.current = controller;
    setTrackLabel(`${callsign.trim() || icao24} · …`);

    try {
      const res = await fetch(`/api/traffic/track?icao24=${icao24}`, {
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        features?: GeoJSON.Feature[];
        meta?: { error?: string; waypointCount?: number; callsign?: string };
      };
      if (selectedIcaoRef.current !== icao24) return;

      const map = mapRef.current;
      const source = map?.getSource(TRACK_SOURCE) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (!source) return;

      const features = data.features ?? [];
      source.setData({ type: "FeatureCollection", features });

      const wp = data.meta?.waypointCount ?? 0;
      const label = (data.meta?.callsign || callsign || icao24).trim();
      if (data.meta?.error || features.length === 0) {
        setTrackLabel(`${label} · no track`);
        const hint = popupRef.current
          ?.getElement()
          ?.querySelector(".as-ac-popup-hint");
        if (hint) hint.textContent = "No trajectory available";
        return;
      }

      setTrackLabel(`${label} · ${wp} pts`);
      const hint = popupRef.current
        ?.getElement()
        ?.querySelector(".as-ac-popup-hint");
      if (hint) hint.textContent = `Track · ${wp} waypoints`;

      const geom = features[0]?.geometry;
      if (geom?.type === "LineString" && map) {
        const bounds = new maplibregl.LngLatBounds(
          geom.coordinates[0] as [number, number],
          geom.coordinates[0] as [number, number],
        );
        for (const c of geom.coordinates) {
          bounds.extend(c as [number, number]);
        }
        map.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 600 });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setTrackLabel(`${callsign || icao24} · track failed`);
    }
  };

  const clearTrackRef = useRef(clearTrack);
  const loadTrackRef = useRef(loadTrack);
  clearTrackRef.current = clearTrack;
  loadTrackRef.current = loadTrack;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const styleUrl =
      process.env.NEXT_PUBLIC_MAP_STYLE ??
      "https://tiles.openfreemap.org/styles/bright";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: SPAIN_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 60_000,
      },
      trackUserLocation: false,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    geolocateControlRef.current = geolocate;
    geolocate.on("geolocate", (e) => {
      const pos = e as GeolocationPosition;
      if (!pos?.coords) return;
      // Prefer an explicit camera request (e.g. View on map deep-link).
      if (useDroneProfileStore.getState().mapCameraRequest) return;
      locateAndFocusRef.current({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    });
    map.addControl(geolocate, "top-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": ENAIRE_ZONE_STYLE.fill,
          "fill-opacity": ENAIRE_ZONE_STYLE.fillOpacity,
        },
      });
      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": ENAIRE_ZONE_STYLE.outline,
          "line-width": ENAIRE_ZONE_STYLE.outlineWidth,
          "line-opacity": ENAIRE_ZONE_STYLE.outlineOpacity,
        },
      });
      map.addLayer({
        id: HIGHLIGHT_FILL,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "identifier"], ""],
        paint: {
          "fill-color": ENAIRE_ZONE_STYLE.outline,
          "fill-opacity": 0.12,
        },
      });
      map.addLayer({
        id: HIGHLIGHT_LINE,
        type: "line",
        source: SOURCE_ID,
        filter: ["==", ["get", "identifier"], ""],
        paint: {
          "line-color": ENAIRE_ZONE_STYLE.outline,
          "line-width": 2.5,
        },
      });

      map.addSource(OBSTACLE_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      addObstacleImages(map);

      map.addLayer({
        id: OBSTACLE_ICON,
        type: "symbol",
        source: OBSTACLE_SOURCE,
        layout: {
          "icon-image": obstacleIconImageExpression() as maplibregl.ExpressionSpecification,
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.7,
            12,
            1.0,
            16,
            1.25,
          ],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: {
          "icon-opacity": [
            "case",
            ["==", ["get", "inactive"], 1],
            0.32,
            1,
          ],
        },
      });
      map.addLayer({
        id: OBSTACLE_LABEL,
        type: "symbol",
        source: OBSTACLE_SOURCE,
        layout: {
          "text-field": ["concat", ["to-string", ["get", "heightM"]], "m"],
          "text-size": 10,
          "text-offset": [0, 1.7],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#222222",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.2,
          "text-opacity": [
            "case",
            ["==", ["get", "inactive"], 1],
            0.35,
            1,
          ],
        },
        minzoom: 10,
      });

      map.addSource(AC_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource(WAKE_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource(FUTURE_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource(TRACK_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Past path (full OpenSky track) — under icons
      map.addLayer({
        id: WAKE_LINE,
        type: "line",
        source: WAKE_SOURCE,
        paint: {
          "line-color": "#717171",
          "line-width": 1.5,
          "line-opacity": 0.55,
        },
      });
      // Estimated future (heading × speed) — dashed
      map.addLayer({
        id: FUTURE_LINE,
        type: "line",
        source: FUTURE_SOURCE,
        paint: {
          "line-color": "#b0b0b0",
          "line-width": 1.25,
          "line-opacity": 0.75,
          "line-dasharray": [2, 2],
        },
      });

      addPlaneImages(map);

      map.addLayer({
        id: AC_ICON,
        type: "symbol",
        source: AC_SOURCE,
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "onGround"], true],
            PLANE_ICON_GND,
            PLANE_ICON_AIR,
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.32,
            10,
            0.48,
            14,
            0.62,
          ],
          "icon-rotate": ["coalesce", ["get", "trackDeg"], 0],
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      map.addLayer({
        id: AC_LABEL,
        type: "symbol",
        source: AC_SOURCE,
        layout: {
          "text-field": ["get", "callsign"],
          "text-size": 10,
          "text-offset": [0, 1.6],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#222222",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.4,
        },
        minzoom: 6,
      });

      map.addLayer({
        id: TRACK_GLOW,
        type: "line",
        source: TRACK_SOURCE,
        paint: {
          "line-color": "#222222",
          "line-width": 6,
          "line-opacity": 0.18,
        },
      });
      map.addLayer({
        id: TRACK_LINE,
        type: "line",
        source: TRACK_SOURCE,
        paint: {
          "line-color": "#ff385c",
          "line-width": 2.5,
          "line-opacity": 0.95,
        },
      });

      const pushViewport = () => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        setMapZoom(zoom);
        const bbox = {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        };
        void loadBboxRef.current(bbox);
        void loadObstaclesBboxRef.current(bbox);
        setViewportRef.current(bbox, zoom);
      };

      pushViewport();
      map.resize();
      setMapReady(true);
    });

    map.on("moveend", () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      setMapZoom(zoom);
      const bbox = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      };
      void loadBboxRef.current(bbox);
      void loadObstaclesBboxRef.current(bbox);
      setViewportRef.current(bbox, zoom);
    });

    map.on("click", OBSTACLE_ICON, (e) => {
      if (placementModeRef.current) return;
      e.originalEvent.stopPropagation();
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      const p = f.properties ?? {};
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const type = String(p.type ?? "") as ObstacleType;
      const kind = (String(p.kind ?? "obstacle") === "fly_spot"
        ? "fly_spot"
        : "obstacle") as PinKind;
      const title =
        obstacleLabel(type, localeRef.current) ||
        String(p.type ?? obstacleFallbackRef.current);
      const id = String(p.id ?? "");
      const ownerId = String(p.userId ?? "");
      const canDelete = Boolean(
        authUserRef.current && authUserRef.current.id === ownerId && id,
      );
      const canVote = Boolean(
        id && (!authUserRef.current || authUserRef.current.id !== ownerId),
      );
      const likes = Number(p.likes ?? 0);
      const dislikes = Number(p.dislikes ?? 0);
      const myVoteRaw = p.myVote ? String(p.myVote) : null;
      const myVote: "up" | "down" | null =
        myVoteRaw === "up" || myVoteRaw === "down" ? myVoteRaw : null;
      const inactive = Number(p.inactive ?? 0) === 1;
      statusPopupActiveRef.current = false;
      popupRef.current?.remove();

      const heightM = Number(p.heightM ?? 0);
      const popupProps = {
        title,
        kindLabel: pinKindLabel(kind, localeRef.current),
        heightM,
        heightLabel:
          kind === "fly_spot"
            ? `~${heightM} m AGL ceiling`
            : `~${heightM} m AGL`,
        message: p.message ? String(p.message) : null,
        photoUrl: p.photoUrl ? String(p.photoUrl) : null,
        authorName: p.authorName ? String(p.authorName) : null,
        authorId: ownerId || null,
        authorHref: ownerId
          ? `/${localeRef.current}/pilots/${ownerId}`
          : null,
        createdAt: p.createdAt ? String(p.createdAt) : null,
        canDelete,
        id,
        likes,
        dislikes,
        myVote,
        inactive,
        canVote,
      };

      let currentVote: "up" | "down" | null = myVote;

      const popup = new maplibregl.Popup({
        offset: 12,
        className: "as-ac-popup",
        maxWidth: "260px",
        closeOnClick: true,
      })
        .setLngLat([lng, lat])
        .setHTML(obstaclePopupHtml(popupProps))
        .addTo(map);
      popupRef.current = popup;

      const wirePopup = () => {
        const el = popup.getElement();
        // Keep map from treating popup UI clicks as map clicks.
        el?.addEventListener("mousedown", (ev) => ev.stopPropagation());
        el?.addEventListener("click", (ev) => ev.stopPropagation());
        el?.querySelector("[data-obstacle-delete]")?.addEventListener(
          "click",
          (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            void (async () => {
              const err = await deleteObstacleRef.current(id);
              if (!err) popup.remove();
            })();
          },
        );
        el?.querySelectorAll("[data-obstacle-vote]").forEach((btn) => {
          btn.addEventListener("click", (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (!authUserRef.current) {
              setAuthModalOpenRef.current(true, "login");
              return;
            }
            if (!canVote && authUserRef.current.id === ownerId) return;
            const vote = (btn as HTMLElement).dataset.obstacleVote;
            if (vote !== "up" && vote !== "down") return;
            const nextValue = currentVote === vote ? null : vote;
            void (async () => {
              const result = await voteObstacleRef.current(id, nextValue);
              if ("error" in result) {
                if (/unauthor/i.test(result.error)) {
                  setAuthModalOpenRef.current(true, "login");
                }
                return;
              }
              currentVote = result.vote.myVote;
              popup.setHTML(
                obstaclePopupHtml({
                  ...popupProps,
                  likes: result.vote.likes,
                  dislikes: result.vote.dislikes,
                  myVote: result.vote.myVote,
                  inactive: result.vote.inactive,
                  canVote: Boolean(
                    authUserRef.current &&
                      authUserRef.current.id !== ownerId,
                  ),
                }),
              );
              wirePopup();
            })();
          });
        });
      };
      wirePopup();
    });

    map.on("mouseenter", OBSTACLE_ICON, () => {
      if (!placementModeRef.current) {
        map.getCanvas().style.cursor = "pointer";
      }
    });
    map.on("mouseleave", OBSTACLE_ICON, () => {
      map.getCanvas().style.cursor = placementModeRef.current
        ? "crosshair"
        : "";
    });

    map.on("click", AC_ICON, (e) => {
      if (placementModeRef.current) return;
      e.originalEvent.stopPropagation();
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      const p = f.properties ?? {};
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const icao24 = String(p.icao24 ?? "").toLowerCase();

      statusPopupActiveRef.current = false;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        offset: 12,
        className: "as-ac-popup",
        maxWidth: "220px",
      })
        .setLngLat([lng, lat])
        .setHTML(
          aircraftPopupHtml({
            title: String(p.callsign ?? p.icao24 ?? "Aircraft"),
            lines: [
              String(p.originCountry ?? ""),
              `Alt ${formatAlt(p.altitudeM)}`,
              `Spd ${formatSpeed(p.velocityMs)}`,
              `${p.onGround ? "On ground" : "Airborne"} · ${String(p.icao24 ?? "")}`,
            ],
          }),
        )
        .addTo(map);

      if (/^[0-9a-f]{6}$/.test(icao24)) {
        selectedIcaoRef.current = icao24;
        void loadTrackRef.current(icao24, String(p.callsign ?? icao24));
      }
    });

    map.on("mouseenter", AC_ICON, () => {
      if (!placementModeRef.current) {
        map.getCanvas().style.cursor = "pointer";
      }
    });
    map.on("mouseleave", AC_ICON, () => {
      map.getCanvas().style.cursor = placementModeRef.current
        ? "crosshair"
        : "";
    });

    map.on("click", (e: maplibregl.MapMouseEvent) => {
      if (placementModeRef.current) {
        setPendingPointRef.current({
          lat: e.lngLat.lat,
          lng: e.lngLat.lng,
        });
        return;
      }

      const hits = map.queryRenderedFeatures(e.point, {
        layers: [AC_ICON, OBSTACLE_ICON].filter((id) => map.getLayer(id)),
      });
      if (hits.length > 0) return;
      clearTrackRef.current();
      statusPopupActiveRef.current = true;
      setSelectedPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    const onResize = () => {
      const el = containerRef.current;
      if (!el || el.clientWidth < 2 || el.clientHeight < 2) return;
      map.resize();
    };
    window.addEventListener("resize", onResize);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect || rect.width < 2 || rect.height < 2) return;
            map.resize();
          })
        : null;
    if (containerRef.current && ro) ro.observe(containerRef.current);

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      trackAbortRef.current?.abort();
      popupRef.current?.remove();
      selectionMarkerRef.current?.remove();
      pendingMarkerRef.current?.remove();
      for (const m of zoneMarkersRef.current) m.remove();
      zoneMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      geolocateControlRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    if (!trafficOn) clearTrack();
  }, [trafficOn]);

  useEffect(() => {
    if (!mapReady || geolocateNonce <= 0 || suppressGeolocate) return;
    geolocateControlRef.current?.trigger();
  }, [mapReady, geolocateNonce, suppressGeolocate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !obstacles) return;
    const source = map.getSource(OBSTACLE_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) source.setData(obstacles);
  }, [mapReady, obstacles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getCanvas().style.cursor = placementMode ? "crosshair" : "";
    // Sheet open/close / pin placement changes overlay layout — keep WebGL sized.
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el || el.clientWidth < 2 || el.clientHeight < 2) return;
      map.resize();
    });
  }, [placementMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selectedPoint) return;
    // Status popup + marker can shift MapLibre layout; re-measure after paint.
    const id = requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el || el.clientWidth < 2 || el.clientHeight < 2) return;
      map.resize();
    });
    return () => cancelAnimationFrame(id);
  }, [mapReady, selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    if (!selectedPoint) {
      selectionMarkerRef.current?.remove();
      selectionMarkerRef.current = null;
      return;
    }

    if (!selectionMarkerRef.current) {
      selectionMarkerRef.current = new maplibregl.Marker({
        element: createSelectionPinEl(),
        anchor: "center",
      })
        .setLngLat([selectedPoint.lng, selectedPoint.lat])
        .addTo(map);
    } else {
      selectionMarkerRef.current.setLngLat([
        selectedPoint.lng,
        selectedPoint.lat,
      ]);
    }
  }, [mapReady, selectedPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!placementMode || !pendingPoint) {
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
      return;
    }

    if (!pendingMarkerRef.current) {
      pendingMarkerRef.current = new maplibregl.Marker({
        element: createPendingPinEl(pinKind),
        anchor: "center",
      })
        .setLngLat([pendingPoint.lng, pendingPoint.lat])
        .addTo(map);
    } else {
      pendingMarkerRef.current.setLngLat([pendingPoint.lng, pendingPoint.lat]);
    }
  }, [placementMode, pendingPoint, pinKind]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !collection) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    // Dedupe stacked identical identifiers (infra often repeats).
    const seen = new Set<string>();
    const features = collection.features.filter((f) => {
      const id = String(
        (f.properties as { identifier?: string } | null)?.identifier ?? "",
      );
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    source.setData({ type: "FeatureCollection", features });
  }, [mapReady, collection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const source = map.getSource(AC_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(aircraft);
  }, [aircraft, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(WAKE_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) source.setData(pastPaths);
  }, [pastPaths]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(FUTURE_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) source.setData(futurePaths);
  }, [futurePaths]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(HIGHLIGHT_FILL)) return;
    const filter: maplibregl.FilterSpecification = highlightedZoneId
      ? ["==", ["get", "identifier"], highlightedZoneId]
      : ["==", ["get", "identifier"], ""];
    map.setFilter(HIGHLIGHT_FILL, filter);
    map.setFilter(HIGHLIGHT_LINE, filter);
  }, [highlightedZoneId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !selectedPoint) return;
    if (!statusPopupActiveRef.current) return;

    const html = airspacePopupHtml({
      loading: statusLoading || (!status && !statusError),
      error: statusError,
      status,
      summary,
      zoneNames: zones.map((z) => z.name || z.identifier).filter(Boolean),
      lat: selectedPoint.lat,
      lng: selectedPoint.lng,
    });

    let popup = popupRef.current;
    const atPoint =
      popup &&
      Math.abs(popup.getLngLat().lat - selectedPoint.lat) < 1e-8 &&
      Math.abs(popup.getLngLat().lng - selectedPoint.lng) < 1e-8;

    if (!popup || !atPoint) {
      popup?.remove();
      popup = new maplibregl.Popup({
        offset: 18,
        className: "as-ac-popup",
        maxWidth: "280px",
        closeOnClick: false,
      })
        .setLngLat([selectedPoint.lng, selectedPoint.lat])
        .setHTML(html)
        .addTo(map);
      popup.on("close", () => {
        statusPopupActiveRef.current = false;
      });
      popupRef.current = popup;
    } else {
      popup.setHTML(html);
    }
  }, [
    mapReady,
    selectedPoint,
    status,
    summary,
    statusLoading,
    statusError,
    zones,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !mapCameraRequest) return;
    map.flyTo({
      center: [mapCameraRequest.lng, mapCameraRequest.lat],
      zoom: mapCameraRequest.zoom,
      essential: true,
      duration: 1200,
    });
    clearMapCameraRequest();
  }, [mapReady, mapCameraRequest, clearMapCameraRequest]);

  // After remount (e.g. React Strict Mode), restore camera to selected point
  // if the one-shot camera request was already consumed.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || mapCameraRequest || !selectedPoint) return;
    const center = map.getCenter();
    const nearSelected =
      Math.abs(center.lat - selectedPoint.lat) < 0.02 &&
      Math.abs(center.lng - selectedPoint.lng) < 0.02;
    if (nearSelected && map.getZoom() >= 12) return;
    map.jumpTo({
      center: [selectedPoint.lng, selectedPoint.lat],
      zoom: 14,
    });
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps -- only on map ready

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    for (const m of zoneMarkersRef.current) m.remove();
    zoneMarkersRef.current = [];

    if (!collection || zones.length === 0) return;

    zones.forEach((zone, idx) => {
      const feature = collection.features.find(
        (f) =>
          f.properties &&
          String((f.properties as { identifier?: string }).identifier) ===
            zone.identifier,
      );
      const center = approxCentroid(feature?.geometry ?? null);
      if (!center) return;
      const marker = new maplibregl.Marker({
        element: createNumberPinEl(idx + 1),
        anchor: "center",
      })
        .setLngLat(center)
        .addTo(map);
      zoneMarkersRef.current.push(marker);
    });
  }, [mapReady, zones, collection]);

  const zoomHint =
    trafficOn && mapZoom < minZoom
      ? `Zoom in (≥${minZoom}) for traffic`
      : null;

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={className ?? "h-full w-full"}
        data-testid="map-view"
      />
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-5rem)] flex-col gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
        <button
          type="button"
          onClick={() => setTrafficOn((v) => !v)}
          className="pointer-events-auto rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--as-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] sm:px-4 sm:py-2 sm:text-[13px]"
        >
          Traffic {trafficOn ? "on" : "off"}
          {trafficOn ? ` · ${aircraftCount}` : ""}
        </button>
        {trafficOn && mapZoom >= minZoom && (
          <div className="pointer-events-none hidden max-w-[15rem] rounded-xl bg-[color-mix(in_srgb,var(--as-surface)_95%,transparent)] px-3 py-2 text-[12px] leading-snug text-[var(--as-ink-soft)] shadow-[0_1px_2px_rgba(0,0,0,0.08)] sm:block">
            Solid = flown path · dashed ≈ 10 min ahead (estimate)
          </div>
        )}
        {trafficOn && trackLabel && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--as-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] sm:py-2 sm:text-[13px]">
            <span className="max-w-[10rem] truncate sm:max-w-[12rem]">{trackLabel}</span>
            <button
              type="button"
              onClick={clearTrack}
              className="text-[var(--as-muted)] hover:text-[var(--as-ink)]"
            >
              ✕
            </button>
          </div>
        )}
        {trafficOn && (zoomHint || trafficError) && (
          <div className="pointer-events-none max-w-[14rem] rounded-xl bg-[color-mix(in_srgb,var(--as-surface)_95%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--as-ink-soft)] shadow-[0_1px_2px_rgba(0,0,0,0.08)] sm:max-w-[15rem] sm:px-3 sm:py-2 sm:text-[12px]">
            {trafficError === "rate_limited"
              ? "Traffic source busy — retrying"
              : trafficError
                ? "Traffic unavailable"
                : zoomHint}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-[calc(108px+0.75rem+env(safe-area-inset-bottom))] left-3 z-30 md:bottom-5 md:left-5">
        <MapAddPinFab />
      </div>
      <MapAddPinSheet />
    </div>
  );
}
