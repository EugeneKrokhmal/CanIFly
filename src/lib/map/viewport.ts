import type { Bbox } from "@canifly/middleware";

/** Skip viewport work until the map moves meaningfully (shared by zones + traffic). */
export function viewportMovedEnough(prev: Bbox | null, next: Bbox): boolean {
  if (!prev) return true;
  const pw = prev.east - prev.west;
  const ph = prev.north - prev.south;
  const nw = next.east - next.west;
  const nh = next.north - next.south;
  const cxP = (prev.west + prev.east) / 2;
  const cyP = (prev.south + prev.north) / 2;
  const cxN = (next.west + next.east) / 2;
  const cyN = (next.south + next.north) / 2;
  return (
    Math.abs(cxP - cxN) > pw * 0.35 ||
    Math.abs(cyP - cyN) > ph * 0.35 ||
    Math.abs(pw - nw) / Math.max(pw, 1e-6) > 0.4 ||
    Math.abs(ph - nh) / Math.max(ph, 1e-6) > 0.4
  );
}

export function zoneLimitForZoom(zoom: number): number {
  // Compact national layers (EE ≈245) need headroom at country zoom.
  if (zoom <= 8) return 400;
  if (zoom <= 11) return 500;
  return 600;
}

export function zoneFeatureSignature(features: GeoJSON.Feature[]): string {
  const ids: string[] = [];
  for (const f of features) {
    const id = String(
      (f.properties as { identifier?: string } | null)?.identifier ?? "",
    );
    if (id) ids.push(id);
  }
  ids.sort();
  return ids.join("\0");
}
