"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import {
  THEME_STORAGE_KEY,
  applyThemeClass,
  resolveDark,
  type ThemePreference,
} from "@/lib/theme-boot";
export type { ThemePreference };

type ThemeState = {
  preference: ThemePreference;
  hydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
  cyclePreference: () => void;
};

function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: "system",
  hydrated: false,
  setPreference: (preference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    } catch {
      /* ignore */
    }
    applyThemeClass(preference);
    set({ preference, hydrated: true });
  },
  cyclePreference: () => {
    const order: ThemePreference[] = ["system", "light", "dark"];
    const i = order.indexOf(get().preference);
    get().setPreference(order[(i + 1) % order.length]!);
  },
}));

/** Sync theme from storage + watch system preference. */
export function ThemeSync() {
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const hydrated = useThemeStore((s) => s.hydrated);

  useEffect(() => {
    setPreference(readStoredPreference());
  }, [setPreference]);

  useEffect(() => {
    if (!hydrated) return;
    applyThemeClass(preference);
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference, hydrated]);

  return null;
}

/** Resolved dark mode for UI that must follow theme (e.g. map basemap). */
export function useIsDark(): boolean {
  const preference = useThemeStore((s) => s.preference);
  const hydrated = useThemeStore((s) => s.hydrated);
  const [, setSystemTick] = useState(0);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTick((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  if (!hydrated && typeof document !== "undefined") {
    return document.documentElement.classList.contains("dark");
  }
  return resolveDark(preference);
}
