"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "canifly-cookie-consent";

export type CookieConsent = "accepted" | "rejected";

export const COOKIE_CONSENT_EVENT = "canifly-cookie-consent";

function readConsent(): CookieConsent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "rejected") return v;
  } catch {
    /* private mode */
  }
  return null;
}

function writeConsent(value: CookieConsent) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function useCookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  const choose = useCallback((value: CookieConsent) => {
    writeConsent(value);
    setVisible(false);
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }),
    );
  }, []);

  return { visible, choose };
}
