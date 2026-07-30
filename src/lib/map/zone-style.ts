import type { ExpressionSpecification } from "maplibre-gl";
import { ENAIRE_ZONE_STYLE, STATUS_COLORS } from "@canifly/middleware";

/**
 * Outline color by zone severity. Fill stays uniform ENAIRE pink elsewhere.
 * Only line-color is data-driven — width/opacity stay static (avoids MapLibre null-number bugs).
 */
export function zoneOutlineColorExpression(): ExpressionSpecification {
  const { prohibited, restricted, limited } = STATUS_COLORS;
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
    ENAIRE_ZONE_STYLE.outline,
  ];
}
