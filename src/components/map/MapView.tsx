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
import type { AppLocale } from "@/i18n/routing";
import { aircraftPopupHtml, airspacePopupHtml, flightPopupHtml, obstaclePopupHtml } from "@/lib/map/html";
import {
  flightAltitudeLineColor,
} from "@/lib/map/flight-style";
import {
  addObstacleImages,
  obstacleIconImageExpression,
} from "@/lib/map/obstacle-icons";
import { MapAddPinFab, MapAddPinSheet } from "@/components/map/MapAddPinSheet";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { useAuthStore } from "@/stores/auth";
import { useObstaclesStore } from "@/stores/obstacles";
import { useIsDark } from "@/stores/theme";
import { useZoneLayers } from "@/hooks/useZoneLayers";
import { useObstacles } from "@/hooks/useObstacles";
import { useMyFlights, type FlightsScope } from "@/hooks/useMyFlights";
import { useAircraftTraffic } from "@/hooks/useAircraftTraffic";
import { zoneFeatureSignature } from "@/lib/map/viewport";
import {
  zoneFillColorExpression,
  zoneFillOpacityExpression,
  zoneOutlineColorExpression,
} from "@/lib/map/zone-style";
import {
  basemapStyleLoadOptions,
  basemapStyleUrl,
  installBasemapFixes,
  openFreeMapTransformRequest,
} from "@/lib/map/basemap";
import {
  animatePaintOpacities,
  type LayerFadeHandle,
} from "@/lib/map/layer-fade";

/** Initial 3D camera — Liberty/Dark include building extrusions that read with pitch. */
const MAX_PITCH = 85;
const DEFAULT_PITCH = 65;
const DEFAULT_BEARING = -20;

const SOURCE_ID = "uas-zones";
const FILL_LAYER = "uas-zones-fill";
const LINE_LAYER = "uas-zones-outline";
const HIGHLIGHT_FILL = "uas-zones-highlight-fill";
const HIGHLIGHT_LINE = "uas-zones-highlight-line";

const OBSTACLE_SOURCE = "obstacles";
const FLIGHT_SOURCE = "my-flights";
const FLIGHT_LINE = "my-flights-line";
const FLIGHT_POINT = "my-flights-point";
const OBSTACLE_ICON = "obstacles-icon";
const OBSTACLE_LABEL = "obstacles-label";

const AC_SOURCE = "aircraft";
const AC_ICON = "aircraft-icon";
const AC_LABEL = "aircraft-label";

const PLANE_ICON_AIR = "plane-air-v2";
const PLANE_ICON_GND = "plane-gnd-v2";

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
      createPlaneIconImageData("#ff385c", "#ffffff"),
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
  /** Initial map center [lng, lat] — e.g. IP-derived live country. Defaults to Spain. */
  initialCenter?: [number, number];
}

export function MapView({ className, initialCenter }: MapViewProps) {
  const locale = useLocale() as AppLocale;
  const tMap = useTranslations("map");
  const isDark = useIsDark();
  const localeRef = useRef(locale);
  const obstacleFallbackRef = useRef(tMap("obstacleFallback"));
  localeRef.current = locale;
  obstacleFallbackRef.current = tMap("obstacleFallback");

  const startCenter = initialCenter ?? SPAIN_CENTER;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const cameraRef = useRef<{
    center: [number, number];
    zoom: number;
    pitch: number;
    bearing: number;
  }>({
    center: startCenter,
    zoom: DEFAULT_ZOOM,
    pitch: DEFAULT_PITCH,
    bearing: DEFAULT_BEARING,
  });
  const selectionMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pendingMarkerRef = useRef<maplibregl.Marker | null>(null);
  const zoneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const geolocateControlRef = useRef<maplibregl.GeolocateControl | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const statusPopupActiveRef = useRef(false);
  const selectedFlightIdRef = useRef<string | null>(null);
  const selectFlightRef = useRef<(flightId: string) => void>(() => {});
  const clearFlightSelectionRef = useRef<() => void>(() => {});
  const flightsFadeRef = useRef<LayerFadeHandle | null>(null);
  const trafficFadeRef = useRef<LayerFadeHandle | null>(null);
  const flightsOnPrevRef = useRef<boolean | null>(null);
  const trafficOnPrevRef = useRef<boolean | null>(null);

  const [trafficOn, setTrafficOn] = useState(true);
  const [flightsOn, setFlightsOn] = useState(true);
  const [flightsScope, setFlightsScope] = useState<FlightsScope>("all");
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const mapZoomRef = useRef(DEFAULT_ZOOM);
  const lastZoneSigRef = useRef("");
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
  const { collection: myFlights, loadBbox: loadMyFlightsBbox } =
    useMyFlights(flightsOn, flightsScope);
  const {
    count: aircraftCount,
    error: trafficError,
    setViewport,
    subscribeLive,
    minZoom,
  } = useAircraftTraffic(trafficOn);

  const loadBboxRef = useRef(loadBbox);
  const loadObstaclesBboxRef = useRef(loadObstaclesBbox);
  const loadMyFlightsBboxRef = useRef(loadMyFlightsBbox);
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
  loadMyFlightsBboxRef.current = loadMyFlightsBbox;
  setViewportRef.current = setViewport;
  locateAndFocusRef.current = locateAndFocus;
  placementModeRef.current = placementMode;
  setPendingPointRef.current = setPendingPoint;
  authUserRef.current = authUser;
  deleteObstacleRef.current = deleteObstacle;
  voteObstacleRef.current = voteObstacle;
  setAuthModalOpenRef.current = setAuthModalOpen;

  useEffect(() => {
    if (!containerRef.current) return;

    const styleUrl = basemapStyleUrl(isDark);
    const { center, zoom, pitch, bearing } = cameraRef.current;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center,
      zoom,
      pitch,
      bearing,
      // Below ~8 a pitched viewport exceeds the API ~7° bbox clamp → empty zones.
      minZoom: 8,
      maxZoom: 18,
      maxPitch: MAX_PITCH,
      pitchWithRotate: true,
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
      bearingSnap: 7,
      renderWorldCopies: false,
      fadeDuration: 0,
      canvasContextAttributes: { antialias: true },
      transformRequest: openFreeMapTransformRequest,
    });
    map.setStyle(styleUrl, basemapStyleLoadOptions);

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }),
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
      const skipGuestGate = useDroneProfileStore.getState().geolocateSkipGuestGate;
      if (skipGuestGate) {
        useDroneProfileStore.setState({ geolocateSkipGuestGate: false });
      }
      locateAndFocusRef.current(
        {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        },
        14,
        { skipGuestGate },
      );
    });
    map.addControl(geolocate, "top-right");

    map.on("load", () => {
      installBasemapFixes(map);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": zoneFillColorExpression(),
          "fill-opacity": zoneFillOpacityExpression(),
        },
      });
      map.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": zoneOutlineColorExpression(),
          "line-width": 1.15,
          "line-opacity": 0.525,
        },
      });
      map.addLayer({
        id: HIGHLIGHT_FILL,
        type: "fill",
        source: SOURCE_ID,
        filter: ["==", ["get", "identifier"], ""],
        paint: {
          "fill-color": ENAIRE_ZONE_STYLE.outline,
          "fill-opacity": 0.084,
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
          "text-color": isDark ? "#f2f2f2" : "#222222",
          "text-halo-color": isDark ? "#121212" : "#ffffff",
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

      map.addSource(FLIGHT_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: FLIGHT_LINE,
        type: "line",
        source: FLIGHT_SOURCE,
        filter: ["==", ["geometry-type"], "LineString"],
        paint: {
          "line-color": flightAltitudeLineColor(),
          "line-width": 3.5,
          "line-opacity": 0.92,
          "line-blur": 0.2,
        },
      });
      map.addLayer({
        id: FLIGHT_POINT,
        type: "circle",
        source: FLIGHT_SOURCE,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#ff385c",
          "circle-opacity": 1,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": isDark ? "#121212" : "#ffffff",
        },
      });

      const clearFlightSelection = () => {
        selectedFlightIdRef.current = null;
        if (!map.getLayer(FLIGHT_LINE)) return;
        map.setPaintProperty(FLIGHT_LINE, "line-opacity", 0.92);
        map.setPaintProperty(FLIGHT_LINE, "line-width", 3.5);
        if (map.getLayer(FLIGHT_POINT)) {
          map.setPaintProperty(FLIGHT_POINT, "circle-opacity", 1);
          map.setPaintProperty(FLIGHT_POINT, "circle-radius", 6);
        }
      };

      const selectFlight = (flightId: string) => {
        selectedFlightIdRef.current = flightId;
        if (!map.getLayer(FLIGHT_LINE)) return;
        map.setPaintProperty(FLIGHT_LINE, "line-opacity", [
          "case",
          ["==", ["get", "id"], flightId],
          1,
          0.22,
        ]);
        map.setPaintProperty(FLIGHT_LINE, "line-width", [
          "case",
          ["==", ["get", "id"], flightId],
          5.5,
          2.5,
        ]);
        if (map.getLayer(FLIGHT_POINT)) {
          map.setPaintProperty(FLIGHT_POINT, "circle-opacity", [
            "case",
            ["==", ["get", "id"], flightId],
            1,
            0.28,
          ]);
          map.setPaintProperty(FLIGHT_POINT, "circle-radius", [
            "case",
            ["==", ["get", "id"], flightId],
            8,
            4,
          ]);
        }
      };

      clearFlightSelectionRef.current = clearFlightSelection;
      selectFlightRef.current = selectFlight;

      map.addSource(AC_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      addPlaneImages(map);

      map.addLayer({
        id: AC_ICON,
        type: "symbol",
        source: AC_SOURCE,
        layout: {
          // Stringify boolean — MapLibre can coerce GeoJSON props oddly.
          "icon-image": [
            "case",
            ["==", ["to-string", ["get", "onGround"]], "true"],
            PLANE_ICON_GND,
            PLANE_ICON_AIR,
          ],
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            6,
            0.85,
            10,
            1.15,
            14,
            1.45,
          ],
          "icon-rotate": ["coalesce", ["get", "trackDeg"], 0],
          "icon-rotation-alignment": "map",
          "icon-pitch-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
        paint: {
          "icon-opacity": 1,
        },
      });
      map.addLayer({
        id: AC_LABEL,
        type: "symbol",
        source: AC_SOURCE,
        layout: {
          "text-field": ["get", "callsign"],
          "text-size": 11,
          "text-offset": [0, 1.55],
          "text-anchor": "top",
          "text-optional": true,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": isDark ? "#f2f2f2" : "#222222",
          "text-halo-color": isDark ? "#121212" : "#ffffff",
          "text-halo-width": 1.6,
          "text-opacity": 1,
        },
        minzoom: 8,
      });

      // Keep traffic above zone fills / basemap labels.
      for (const id of [AC_ICON, AC_LABEL]) {
        if (map.getLayer(id)) map.moveLayer(id);
      }

      const pushViewport = () => {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const prevFloor = Math.floor(mapZoomRef.current);
        mapZoomRef.current = zoom;
        if (prevFloor !== Math.floor(zoom)) setMapZoom(zoom);
        const bbox = {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        };
        void loadBboxRef.current(bbox, zoom);
        void loadObstaclesBboxRef.current(bbox);
        void loadMyFlightsBboxRef.current(bbox);
        setViewportRef.current(bbox, zoom);
      };

      pushViewport();
      map.resize();
      setMapReady(true);
    });

    map.on("moveend", () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const c = map.getCenter();
      cameraRef.current = {
        center: [c.lng, c.lat],
        zoom,
        pitch: map.getPitch(),
        bearing: map.getBearing(),
      };
      const prevFloor = Math.floor(mapZoomRef.current);
      mapZoomRef.current = zoom;
      if (prevFloor !== Math.floor(zoom)) setMapZoom(zoom);
      const bbox = {
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      };
      void loadBboxRef.current(bbox, zoom);
      void loadObstaclesBboxRef.current(bbox);
      void loadMyFlightsBboxRef.current(bbox);
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

    const openFlightPopup = (
      e: maplibregl.MapLayerMouseEvent,
    ) => {
      if (placementModeRef.current) return;
      e.originalEvent.stopPropagation();
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties ?? {};
      const lngLat = e.lngLat;
      const startLat = Number(p.startLat);
      const startLng = Number(p.startLng);
      const ownerId = String(p.userId ?? "");
      const flightId = String(p.id ?? "");
      const altitudeM = Number(p.altitudeM);
      statusPopupActiveRef.current = false;
      popupRef.current?.remove();
      if (flightId) selectFlightRef.current(flightId);
      const popup = new maplibregl.Popup({
        offset: 14,
        className: "as-ac-popup as-flight-map-popup",
        maxWidth: "300px",
        closeOnClick: true,
      })
        .setLngLat(lngLat)
        .setHTML(
          flightPopupHtml({
            aircraftName: String(p.aircraftName ?? "Flight"),
            startedAt: p.startedAt ? String(p.startedAt) : null,
            durationS: Number(p.durationS ?? 0),
            distanceM: Number(p.distanceM ?? 0),
            maxHeightM: Number.isFinite(Number(p.maxHeightM))
              ? Number(p.maxHeightM)
              : null,
            maxHSpeedMps: Number.isFinite(Number(p.maxHSpeedMps))
              ? Number(p.maxHSpeedMps)
              : null,
            altitudeM: Number.isFinite(altitudeM) ? altitudeM : null,
            hasTrack:
              p.hasTrack === true ||
              p.hasTrack === "true" ||
              p.hasTrack === 1 ||
              p.hasTrack === "1",
            authorName: p.authorName ? String(p.authorName) : null,
            authorHref: ownerId
              ? `/${localeRef.current}/pilots/${ownerId}`
              : null,
            authorAvatarUrl: p.authorAvatarUrl
              ? String(p.authorAvatarUrl)
              : null,
            authorRankId: p.authorRankId
              ? String(p.authorRankId)
              : null,
            startLat: Number.isFinite(startLat) ? startLat : null,
            startLng: Number.isFinite(startLng) ? startLng : null,
          }),
        )
        .addTo(map);
      popup.on("close", () => {
        if (popupRef.current === popup) {
          clearFlightSelectionRef.current();
        }
      });
      popupRef.current = popup;
    };

    map.on("click", FLIGHT_LINE, openFlightPopup);
    map.on("click", FLIGHT_POINT, openFlightPopup);
    for (const layerId of [FLIGHT_LINE, FLIGHT_POINT]) {
      map.on("mouseenter", layerId, () => {
        if (!placementModeRef.current) {
          map.getCanvas().style.cursor = "pointer";
        }
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = placementModeRef.current
          ? "crosshair"
          : "";
      });
    }

    map.on("click", AC_ICON, (e) => {
      if (placementModeRef.current) return;
      e.originalEvent.stopPropagation();
      const f = e.features?.[0];
      if (!f || f.geometry.type !== "Point") return;
      const p = f.properties ?? {};
      const [lng, lat] = f.geometry.coordinates as [number, number];

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
        layers: [AC_ICON, OBSTACLE_ICON, FLIGHT_LINE, FLIGHT_POINT].filter(
          (id) => map.getLayer(id),
        ),
      });
      if (hits.length > 0) return;

      if (
        !setSelectedPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng })
      ) {
        return;
      }
      statusPopupActiveRef.current = true;
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
      {
        const popup = popupRef.current;
        popupRef.current = null;
        popup?.remove();
      }
      selectionMarkerRef.current?.remove();
      selectionMarkerRef.current = null;
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
      for (const m of zoneMarkersRef.current) m.remove();
      zoneMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
      geolocateControlRef.current = null;
      setMapReady(false);
    };
  }, [isDark, setSelectedPoint]);

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
    if (!mapReady || !map || !myFlights) return;
    const source = map.getSource(FLIGHT_SOURCE) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) source.setData(myFlights);
  }, [mapReady, myFlights]);

  useEffect(() => {
    if (!authUser && flightsScope === "mine") {
      setFlightsScope("all");
    }
  }, [authUser, flightsScope]);

  useEffect(() => {
    if (mapReady) return;
    flightsOnPrevRef.current = null;
    trafficOnPrevRef.current = null;
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    flightsFadeRef.current?.cancel();
    flightsFadeRef.current = null;

    const targets = [
      { layerId: FLIGHT_LINE, property: "line-opacity", visible: 0.92 },
      { layerId: FLIGHT_POINT, property: "circle-opacity", visible: 1 },
    ];

    const prev = flightsOnPrevRef.current;
    flightsOnPrevRef.current = flightsOn;

    // First paint after map ready — snap, don't entrance-fade.
    if (prev === null) {
      for (const id of [FLIGHT_LINE, FLIGHT_POINT]) {
        if (!map.getLayer(id)) continue;
        map.setLayoutProperty(
          id,
          "visibility",
          flightsOn ? "visible" : "none",
        );
      }
      return;
    }

    if (!flightsOn) {
      popupRef.current?.remove();
      popupRef.current = null;
      clearFlightSelectionRef.current();
      flightsFadeRef.current = animatePaintOpacities(map, targets, false, {
        durationMs: 260,
      });
      return () => {
        flightsFadeRef.current?.cancel();
        flightsFadeRef.current = null;
      };
    }

    flightsFadeRef.current = animatePaintOpacities(map, targets, true, {
      durationMs: 320,
    });
    return () => {
      flightsFadeRef.current?.cancel();
      flightsFadeRef.current = null;
    };
  }, [mapReady, flightsOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !flightsOn) return;
    const bounds = map.getBounds();
    loadMyFlightsBboxRef.current({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  }, [mapReady, flightsOn, flightsScope, authUser]);

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

    const sig = zoneFeatureSignature(collection.features);
    if (sig === lastZoneSigRef.current) return;
    lastZoneSigRef.current = sig;

    source.setData(collection);
  }, [mapReady, collection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !trafficOn) return;
    return subscribeLive((fc) => {
      const source = map.getSource(AC_SOURCE) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (source) source.setData(fc);
    });
  }, [mapReady, subscribeLive, trafficOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    trafficFadeRef.current?.cancel();
    trafficFadeRef.current = null;

    const targets = [
      { layerId: AC_ICON, property: "icon-opacity", visible: 1 },
      { layerId: AC_LABEL, property: "text-opacity", visible: 1 },
    ];

    const prev = trafficOnPrevRef.current;
    trafficOnPrevRef.current = trafficOn;

    if (prev === null) {
      for (const id of [AC_ICON, AC_LABEL]) {
        if (!map.getLayer(id)) continue;
        map.setLayoutProperty(
          id,
          "visibility",
          trafficOn ? "visible" : "none",
        );
      }
      return;
    }

    if (trafficOn) {
      trafficFadeRef.current = animatePaintOpacities(map, targets, true, {
        durationMs: 320,
      });
      return () => {
        trafficFadeRef.current?.cancel();
        trafficFadeRef.current = null;
      };
    }

    trafficFadeRef.current = animatePaintOpacities(map, targets, false, {
      durationMs: 260,
      onDone: () => {
        const source = map.getSource(AC_SOURCE) as
          | maplibregl.GeoJSONSource
          | undefined;
        if (source) {
          source.setData({ type: "FeatureCollection", features: [] });
        }
      },
    });
    return () => {
      trafficFadeRef.current?.cancel();
      trafficFadeRef.current = null;
    };
  }, [mapReady, trafficOn]);

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
      // Once a verdict exists, keep showing it (status is cleared on each new tap).
      loading: statusLoading && !status && !statusError,
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
      const previous = popup;
      // Clear ref before remove so the old popup's "close" handler does not
      // clear statusPopupActiveRef and block subsequent status updates.
      popupRef.current = null;
      previous?.remove();

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
        if (popupRef.current !== popup) return;
        statusPopupActiveRef.current = false;
        popupRef.current = null;
      });
      popupRef.current = popup;
      statusPopupActiveRef.current = true;
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
      pitch: map.getPitch(),
      bearing: map.getBearing(),
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
      pitch: map.getPitch(),
      bearing: map.getBearing(),
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
        data-tour="map"
      />
      <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-5rem)] flex-col items-start gap-1.5 sm:left-3 sm:top-3 sm:gap-2">
        <div
          data-tour="traffic"
          data-on={trafficOn ? "true" : "false"}
          className="as-map-chip pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => setTrafficOn((v) => !v)}
            aria-pressed={trafficOn}
            className="as-map-chip__hit as-map-chip__main"
          >
            <span className="as-map-toggle-dot" aria-hidden />
            <span>
              Traffic {trafficOn ? "on" : "off"}
              {trafficOn ? ` · ${aircraftCount}` : ""}
            </span>
          </button>
        </div>
        <div
          data-tour="flights"
          data-on={flightsOn ? "true" : "false"}
          className="as-map-chip pointer-events-auto"
        >
          <button
            type="button"
            onClick={() => setFlightsOn((v) => !v)}
            aria-pressed={flightsOn}
            className="as-map-chip__hit as-map-chip__main"
          >
            <span className="as-map-toggle-dot" aria-hidden />
            <span>
              Flights {flightsOn ? "on" : "off"}
              {flightsOn && myFlights
                ? ` · ${new Set(
                    myFlights.features
                      .map((f) => f.properties?.id)
                      .filter((id) => id != null && id !== ""),
                  ).size}`
                : ""}
            </span>
          </button>
          <div
            className="as-map-chip-scope"
            data-open={flightsOn ? "true" : "false"}
            role="group"
            aria-label="Flight filter"
            aria-hidden={!flightsOn}
          >
            <div className="as-map-chip-scope-inner">
              <button
                type="button"
                onClick={() => setFlightsScope("all")}
                data-active={flightsScope === "all" ? "true" : "false"}
                tabIndex={flightsOn ? 0 : -1}
                className="as-map-chip__hit as-map-chip__seg"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!authUser) {
                    setAuthModalOpen(true);
                    return;
                  }
                  setFlightsScope("mine");
                }}
                data-active={flightsScope === "mine" ? "true" : "false"}
                tabIndex={flightsOn ? 0 : -1}
                className="as-map-chip__hit as-map-chip__seg"
              >
                Mine
              </button>
            </div>
          </div>
        </div>
        {trafficOn && (zoomHint || trafficError) && (
          <div className="as-map-hint pointer-events-none">
            {trafficError === "rate_limited"
              ? "Traffic source busy — retrying"
              : trafficError
                ? "Traffic unavailable"
                : zoomHint}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-[calc(108px+0.75rem+env(safe-area-inset-bottom))] left-3 z-30 md:hidden">
        <MapAddPinFab />
      </div>
      <MapAddPinSheet />
    </div>
  );
}
