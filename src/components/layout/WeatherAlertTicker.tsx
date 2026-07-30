"use client";

import { useTranslations } from "next-intl";
import { WEATHER_SEVERITY_STYLE } from "@/lib/weather/severity";
import { useWeatherStore } from "@/stores/weather";

/** Always-visible scrolling weather strip under the header. */
export function WeatherAlertTicker() {
  const t = useTranslations("nav");
  const weather = useWeatherStore((s) => s.weather);

  const severity = weather?.severity ?? "good";
  const style = WEATHER_SEVERITY_STYLE[severity];

  let message: string;
  if (!weather) {
    message = t("weatherLoading");
  } else if (severity === "danger") {
    message = `${t("weatherDanger")}: ${weather.warningDetail} — ${t("weatherFlyHint")}`;
  } else if (severity === "caution") {
    message = `${t("weatherCaution")}: ${weather.warningDetail} — ${t("weatherFlyHint")}`;
  } else {
    const where = weather.atPin ? t("weatherAtPin") : t("weatherArea");
    message = `${t("weatherGood")}: ${weather.label}${
      weather.windKmh != null ? ` · ${weather.windKmh} km/h` : ""
    } · ${where}`;
  }

  const loop = `${message}   ·   ${message}   ·   ${message}   ·   `;

  return (
    <div
      className="relative z-40 overflow-hidden border-b"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="as-weather-marquee flex whitespace-nowrap py-1 text-[11px] font-semibold tracking-wide sm:text-[12px]">
        <span className="as-weather-marquee-track inline-block pr-8">
          {loop}
        </span>
        <span className="as-weather-marquee-track inline-block pr-8" aria-hidden>
          {loop}
        </span>
      </div>
    </div>
  );
}
