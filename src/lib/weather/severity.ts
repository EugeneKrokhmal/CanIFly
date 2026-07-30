import { weatherKind, weatherLabel } from "./codes";

/** Flying-condition severity for open-category drones. */
export type WeatherSeverity = "good" | "caution" | "danger";

const WIND_CAUTION_KMH = 25;
const WIND_DANGER_KMH = 40;

/**
 * Score current WMO weather + wind for drone safety (rough heuristic).
 * Thunderstorm / heavy precip → danger; light rain/fog/moderate wind → caution.
 */
export function weatherSeverity(
  weatherCode: number,
  windKmh: number | null | undefined,
): WeatherSeverity {
  const kind = weatherKind(weatherCode);
  const wind = windKmh ?? 0;

  if (kind === "storm") return "danger";
  if (weatherCode === 65 || weatherCode === 67 || weatherCode === 82) {
    return "danger"; // heavy rain / freezing rain / violent showers
  }
  if (weatherCode === 75 || weatherCode === 77 || weatherCode === 86) {
    return "danger"; // heavy snow
  }
  if (wind >= WIND_DANGER_KMH) return "danger";

  if (kind === "rain" || kind === "snow" || kind === "fog") return "caution";
  if (wind >= WIND_CAUTION_KMH) return "caution";

  return "good";
}

/** Short reason for the ticker / tooltip. */
export function weatherWarningDetail(
  weatherCode: number,
  windKmh: number | null | undefined,
  label?: string,
): string {
  const parts: string[] = [];
  const kind = weatherKind(weatherCode);
  const name = label ?? weatherLabel(weatherCode);
  const wind = windKmh ?? 0;

  if (kind === "storm") parts.push(name);
  else if (kind === "rain" || kind === "snow" || kind === "fog") parts.push(name);
  else if (kind !== "clear" && kind !== "partly") parts.push(name);

  if (wind >= WIND_CAUTION_KMH) {
    parts.push(`wind ${Math.round(wind)} km/h`);
  }

  if (parts.length === 0) return name;
  return parts.join(" · ");
}

export const WEATHER_SEVERITY_STYLE: Record<
  WeatherSeverity,
  { bg: string; border: string; text: string; soft: string }
> = {
  good: {
    bg: "color-mix(in srgb, var(--as-clear) 14%, var(--as-surface))",
    border: "color-mix(in srgb, var(--as-clear) 45%, var(--as-line))",
    text: "var(--as-clear)",
    soft: "color-mix(in srgb, var(--as-clear) 70%, var(--as-ink-soft))",
  },
  caution: {
    bg: "color-mix(in srgb, var(--as-restricted) 16%, var(--as-surface))",
    border: "color-mix(in srgb, var(--as-restricted) 55%, var(--as-line))",
    text: "var(--as-restricted)",
    soft: "color-mix(in srgb, var(--as-restricted) 75%, var(--as-ink))",
  },
  danger: {
    bg: "color-mix(in srgb, var(--as-prohibited) 16%, var(--as-surface))",
    border: "color-mix(in srgb, var(--as-prohibited) 55%, var(--as-line))",
    text: "var(--as-prohibited)",
    soft: "color-mix(in srgb, var(--as-prohibited) 75%, var(--as-ink))",
  },
};
