"use client";

import { useEffect, useState } from "react";
import { SPAIN_CENTER } from "@canifly/middleware";
import { weatherKind, type WeatherKind } from "@/lib/weather/codes";
import {
  WEATHER_SEVERITY_STYLE,
  weatherSeverity,
  weatherWarningDetail,
} from "@/lib/weather/severity";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { useWeatherStore } from "@/stores/weather";

type WeatherPayload = {
  temperatureC: number;
  weatherCode: number;
  label: string;
  windKmh: number | null;
  humidityPct: number | null;
};

function WeatherIcon({ kind }: { kind: WeatherKind }) {
  const stroke = "currentColor";
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  if (kind === "clear") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (kind === "partly") {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="3" />
        <path d="M18 17a4 4 0 0 0-1-7.9 5 5 0 0 0-9.4 1.5A3.5 3.5 0 0 0 8 17h10z" />
      </svg>
    );
  }
  if (kind === "fog") {
    return (
      <svg {...common}>
        <path d="M4 10h16M5 14h14M7 18h10" />
      </svg>
    );
  }
  if (kind === "rain" || kind === "storm") {
    return (
      <svg {...common}>
        <path d="M18 15a4 4 0 0 0-1-7.9 5 5 0 0 0-9.4 1.5A3.5 3.5 0 0 0 8 15h10z" />
        <path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3" />
      </svg>
    );
  }
  if (kind === "snow") {
    return (
      <svg {...common}>
        <path d="M18 14a4 4 0 0 0-1-7.9 5 5 0 0 0-9.4 1.5A3.5 3.5 0 0 0 8 14h10z" />
        <path d="M10 17v3M14 17v3M12 16v4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M18 17a4 4 0 0 0-1-7.9 5 5 0 0 0-9.4 1.5A3.5 3.5 0 0 0 8 17h10z" />
    </svg>
  );
}

export function WeatherWidget() {
  const selectedPoint = useDroneProfileStore((s) => s.selectedPoint);
  const setWeatherStore = useWeatherStore((s) => s.setWeather);
  const [weather, setWeather] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState(false);

  const atPin = Boolean(selectedPoint);
  const lat = selectedPoint?.lat ?? SPAIN_CENTER[1];
  const lng = selectedPoint?.lng ?? SPAIN_CENTER[0];

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        setError(false);
        const qs = new URLSearchParams({
          lat: lat.toFixed(3),
          lng: lng.toFixed(3),
        });
        const res = await fetch(`/api/weather?${qs}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("weather");
        const data = (await res.json()) as WeatherPayload;
        if (cancelled) return;
        setWeather(data);
        const severity = weatherSeverity(data.weatherCode, data.windKmh);
        setWeatherStore({
          ...data,
          severity,
          warningDetail: weatherWarningDetail(
            data.weatherCode,
            data.windKmh,
            data.label,
          ),
          atPin,
        });
      } catch {
        if (!cancelled && !controller.signal.aborted) {
          setError(true);
          setWeather(null);
          setWeatherStore(null);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lng, atPin, setWeatherStore]);

  if (error) {
    return (
      <div
        className="inline-flex h-8 items-center rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] px-2.5 text-[12px] text-[var(--as-muted)] sm:px-3"
        title="Weather unavailable"
      >
        —
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="h-8 w-10 animate-pulse rounded-full bg-[var(--as-surface-muted)] sm:w-[7.5rem]" />
    );
  }

  const severity = weatherSeverity(weather.weatherCode, weather.windKmh);
  const style = WEATHER_SEVERITY_STYLE[severity];
  const title = atPin
    ? `Weather at pin · ${weather.label}`
    : `Weather near map centre · ${weather.label}`;

  return (
    <div
      className="inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 shadow-[var(--as-shadow)] sm:gap-2 sm:px-3"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
      title={title}
      aria-label={title}
    >
      <WeatherIcon kind={weatherKind(weather.weatherCode)} />
      <span className="text-[12px] font-semibold" style={{ color: style.text }}>
        {weather.temperatureC}°
      </span>
      <span
        className="hidden text-[12px] md:inline"
        style={{ color: style.soft }}
      >
        {weather.label}
      </span>
      {weather.windKmh != null && (
        <span
          className="hidden border-l pl-2 text-[12px] lg:inline"
          style={{
            borderColor: style.border,
            color: style.soft,
          }}
        >
          {weather.windKmh} km/h
        </span>
      )}
    </div>
  );
}
