import type { ExpressionSpecification } from "maplibre-gl";

/** Altitude (AGL m) → color: blue (low) → green → yellow → orange → rausch (high). */
export function flightAltitudeLineColor(): ExpressionSpecification {
  return [
    "case",
    ["==", ["get", "hasAltitude"], true],
    [
      "interpolate",
      ["linear"],
      ["coalesce", ["get", "altitudeM"], 0],
      0,
      "#3b82f6",
      20,
      "#22c55e",
      50,
      "#eab308",
      80,
      "#f97316",
      120,
      "#ff385c",
    ],
    "#ff385c",
  ];
}
