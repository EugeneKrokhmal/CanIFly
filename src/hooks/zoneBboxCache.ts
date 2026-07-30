import type { Bbox } from "@canifly/middleware";

const CACHE_TTL_MS = 30 * 60_000;
const MAX_BBOX_ENTRIES = 32;
const MAX_FEATURES = 2_500;
const VIEWPORT_PAD = 0.12;

type BboxEntry = {
  collection: GeoJSON.FeatureCollection;
  expiresAt: number;
};

const bboxCache = new Map<string, BboxEntry>();
const featuresById = new Map<string, GeoJSON.Feature>();
const featureOrder: string[] = [];

function roundCoord(n: number): string {
  return (Math.round(n / 0.1) * 0.1).toFixed(2);
}

export function zoneBboxClientCacheKey(
  bbox: Bbox,
  weightClass: string,
  maxAltitudeAgl: number,
): string {
  return `${roundCoord(bbox.west)},${roundCoord(bbox.south)},${roundCoord(bbox.east)},${roundCoord(bbox.north)}:${weightClass}:${maxAltitudeAgl}`;
}

function featureKey(f: GeoJSON.Feature): string | null {
  const p = (f.properties ?? {}) as { identifier?: string; country?: string };
  if (!p.identifier) return null;
  return `${p.country ?? ""}:${p.identifier}`;
}

function geometryBounds(
  geometry: GeoJSON.Geometry,
): { west: number; south: number; east: number; north: number } | null {
  const coords: number[][] = [];

  const walk = (g: GeoJSON.Geometry) => {
    switch (g.type) {
      case "Point":
        coords.push(g.coordinates as number[]);
        break;
      case "MultiPoint":
      case "LineString":
        for (const c of g.coordinates as number[][]) coords.push(c);
        break;
      case "MultiLineString":
      case "Polygon":
        for (const ring of g.coordinates as number[][][]) {
          for (const c of ring) coords.push(c);
        }
        break;
      case "MultiPolygon":
        for (const poly of g.coordinates as number[][][][]) {
          for (const ring of poly) {
            for (const c of ring) coords.push(c);
          }
        }
        break;
      default:
        break;
    }
  };

  walk(geometry);
  if (coords.length === 0) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lng, lat] of coords) {
    if (lng < west) west = lng;
    if (lng > east) east = lng;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return { west, south, east, north };
}

function featureBounds(
  f: GeoJSON.Feature,
): { west: number; south: number; east: number; north: number } | null {
  if (!f.geometry) return null;
  return geometryBounds(f.geometry);
}

function expandBbox(bbox: Bbox, pad = VIEWPORT_PAD): Bbox {
  const w = bbox.east - bbox.west;
  const h = bbox.north - bbox.south;
  return {
    west: bbox.west - w * pad,
    south: bbox.south - h * pad,
    east: bbox.east + w * pad,
    north: bbox.north + h * pad,
  };
}

function bboxesOverlap(
  a: { west: number; south: number; east: number; north: number },
  b: Bbox,
): boolean {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

function trimFeatureStore(): void {
  while (featuresById.size > MAX_FEATURES && featureOrder.length > 0) {
    const oldest = featureOrder.shift();
    if (oldest) featuresById.delete(oldest);
  }
}

export function mergeZoneFeatures(features: GeoJSON.Feature[]): void {
  for (const f of features) {
    const key = featureKey(f);
    if (!key) continue;
    if (!featuresById.has(key)) featureOrder.push(key);
    featuresById.set(key, f);
  }
  trimFeatureStore();
}

export function zonesForViewport(bbox: Bbox): GeoJSON.FeatureCollection {
  const view = expandBbox(bbox);
  const features = [...featuresById.values()].filter((f) => {
    const bounds = featureBounds(f);
    return bounds ? bboxesOverlap(bounds, view) : false;
  });
  return { type: "FeatureCollection", features };
}

export function clearZoneFeatureStore(): void {
  featuresById.clear();
  featureOrder.length = 0;
  bboxCache.clear();
}

export function getZoneBboxClientCached(
  key: string,
): GeoJSON.FeatureCollection | null {
  const hit = bboxCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    bboxCache.delete(key);
    return null;
  }
  return hit.collection;
}

export function setZoneBboxClientCached(
  key: string,
  collection: GeoJSON.FeatureCollection,
): void {
  if (bboxCache.size >= MAX_BBOX_ENTRIES) {
    const oldest = bboxCache.keys().next().value;
    if (oldest) bboxCache.delete(oldest);
  }
  bboxCache.set(key, {
    collection,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
