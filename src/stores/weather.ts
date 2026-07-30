"use client";

import { create } from "zustand";
import type { WeatherSeverity } from "@/lib/weather/severity";

export type WeatherSnapshot = {
  temperatureC: number;
  weatherCode: number;
  label: string;
  windKmh: number | null;
  humidityPct: number | null;
  severity: WeatherSeverity;
  warningDetail: string;
  /** True when weather is for the user's dropped pin (not default centre). */
  atPin: boolean;
};

interface WeatherState {
  weather: WeatherSnapshot | null;
  setWeather: (w: WeatherSnapshot | null) => void;
}

export const useWeatherStore = create<WeatherState>((set) => ({
  weather: null,
  setWeather: (weather) => set({ weather }),
}));
