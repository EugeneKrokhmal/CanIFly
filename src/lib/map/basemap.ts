import type maplibregl from "maplibre-gl";
import type { RequestParameters, ResourceType, StyleSpecification } from "maplibre-gl";

export const OPENFREEMAP_ORIGIN = "https://tiles.openfreemap.org";
export const OPENFREEMAP_PROXY_PREFIX = "/ofm";

/** OpenFreeMap stopped serving Open Sans stacks; MapLibre demo fonts work. */
export const BASEMAP_GLYPHS_URL =
  "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

const MAP_STYLE_LIGHT =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? `${OPENFREEMAP_ORIGIN}/styles/liberty`;
const MAP_STYLE_DARK =
  process.env.NEXT_PUBLIC_MAP_STYLE_DARK ?? `${OPENFREEMAP_ORIGIN}/styles/dark`;

/** Liberty / dark basemap style URL (direct or env override). */
export function basemapStyleUrl(dark: boolean): string {
  return dark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT;
}

/** Patch OFM styles: working glyph CDN (OFM fonts 404 for Open Sans stacks). */
export function patchBasemapStyle(style: StyleSpecification): StyleSpecification {
  return { ...style, glyphs: BASEMAP_GLYPHS_URL };
}

export const basemapStyleLoadOptions = {
  transformStyle: (
    _previous: StyleSpecification | undefined,
    next: StyleSpecification,
  ) => patchBasemapStyle(next),
};

/**
 * Route OpenFreeMap fetches through our origin so tiles are not blocked or
 * aborted as third-party requests (common cause of AJAXError status 0).
 */
export function openFreeMapTransformRequest(
  url: string,
  _resourceType?: ResourceType,
): RequestParameters {
  if (!url.startsWith(OPENFREEMAP_ORIGIN)) {
    return { url };
  }
  const path = `${OPENFREEMAP_PROXY_PREFIX}${url.slice(OPENFREEMAP_ORIGIN.length)}`;
  if (typeof window !== "undefined") {
    return { url: new URL(path, window.location.origin).href };
  }
  return { url: path };
}

/** Glyph fallback + quiet missing POI sprites (OFM sheet lacks some icon ids). */
export function installBasemapFixes(map: maplibregl.Map): void {
  map.setGlyphs(BASEMAP_GLYPHS_URL);

  map.on("styleimagemissing", (event) => {
    if (map.hasImage(event.id)) return;
    map.addImage(
      event.id,
      { width: 1, height: 1, data: new Uint8Array(4) },
      { pixelRatio: 1 },
    );
  });
}
