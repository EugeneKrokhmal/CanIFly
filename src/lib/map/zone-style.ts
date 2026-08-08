import type { ExpressionSpecification } from "maplibre-gl";
import { ENAIRE_ZONE_STYLE, STATUS_COLORS } from "@canifly/middleware";

/** Soft advisory fill for NO_RESTRICTION / INFO geozones (matches EANS yellow-ish wash). */
const INFO_ZONE_STYLE = {
  fill: "#e6d27a",
  outline: "#c4a84a",
  fillOpacity: 0.14,
} as const;

/**
 * Outline color by zone severity. Only line-color is data-driven —
 * width/opacity stay static (avoids MapLibre null-number bugs).
 */
export function zoneOutlineColorExpression(): ExpressionSpecification {
  const { prohibited, restricted, limited, clear } = STATUS_COLORS;
  return [
    "case",
    ["==", ["get", "mapStatus"], "prohibited"],
    prohibited.outline,
    ["==", ["get", "mapStatus"], "restricted"],
    restricted.outline,
    ["==", ["get", "mapStatus"], "limited"],
    limited.outline,
    [
      "==",
      ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
      "PROHIBITED",
    ],
    prohibited.outline,
    [
      "any",
      [
        "==",
        ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
        "REQ_AUTHORISATION",
      ],
      [
        "==",
        ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
        "REQ_AUTHORIZATION",
      ],
    ],
    restricted.outline,
    [
      "==",
      ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
      "CONDITIONAL",
    ],
    limited.outline,
    // INFO overlays (majority of EE/LT) — visible but not “restricted” orange.
    [
      "==",
      ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
      "NO_RESTRICTION",
    ],
    INFO_ZONE_STYLE.outline,
    ["==", ["get", "mapStatus"], "clear"],
    clear.outline,
    ENAIRE_ZONE_STYLE.outline,
  ];
}

/** Fill tint by severity so hard no-fly (airports etc.) read as red, not uniform pink. */
export function zoneFillColorExpression(): ExpressionSpecification {
  const { prohibited, restricted, limited, clear } = STATUS_COLORS;
  return [
    "case",
    ["==", ["get", "mapStatus"], "prohibited"],
    prohibited.fill,
    ["==", ["get", "mapStatus"], "restricted"],
    restricted.fill,
    ["==", ["get", "mapStatus"], "limited"],
    limited.fill,
    [
      "==",
      ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
      "PROHIBITED",
    ],
    prohibited.fill,
    [
      "any",
      [
        "==",
        ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
        "REQ_AUTHORISATION",
      ],
      [
        "==",
        ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
        "REQ_AUTHORIZATION",
      ],
    ],
    restricted.fill,
    [
      "==",
      ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
      "CONDITIONAL",
    ],
    limited.fill,
    [
      "==",
      ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
      "NO_RESTRICTION",
    ],
    INFO_ZONE_STYLE.fill,
    ["==", ["get", "mapStatus"], "clear"],
    clear.fill,
    ENAIRE_ZONE_STYLE.fill,
  ];
}

export function zoneFillOpacityExpression(): ExpressionSpecification {
  const { prohibited, limited } = STATUS_COLORS;
  return [
    "*",
    [
      "case",
      ["==", ["get", "mapStatus"], "prohibited"],
      prohibited.fillOpacity,
      [
        "==",
        ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
        "PROHIBITED",
      ],
      prohibited.fillOpacity,
      [
        "==",
        ["upcase", ["to-string", ["coalesce", ["get", "restriction"], ""]]],
        "NO_RESTRICTION",
      ],
      INFO_ZONE_STYLE.fillOpacity,
      ["==", ["get", "mapStatus"], "limited"],
      limited.fillOpacity,
      ENAIRE_ZONE_STYLE.fillOpacity,
    ],
    0.7,
  ];
}
