"use client";

import { useEffect } from "react";
import { create } from "zustand";
import {
  THEME_STORAGE_KEY,
  applyThemeClass,
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
