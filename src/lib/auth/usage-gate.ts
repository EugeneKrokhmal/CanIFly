const CLICKS_KEY = "canifly-guest-map-clicks";
/** @deprecated legacy unique-location list — migrated into click count on read */
const LEGACY_CHECKS_KEY = "canifly-location-checks";
const SNOOZE_KEY = "canifly-auth-snooze-until";

export const FREE_CHECK_LIMIT = 3;
export const USAGE_GATE_EVENT = "canifly-usage-gate-update";

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function loadClickCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(CLICKS_KEY);
    if (raw != null) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    const legacy = localStorage.getItem(LEGACY_CHECKS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as unknown;
      if (Array.isArray(parsed)) return parsed.length;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function saveClickCount(count: number): void {
  localStorage.setItem(CLICKS_KEY, String(count));
  window.dispatchEvent(new Event(USAGE_GATE_EVENT));
}

/** Guest map taps used (0 until first allowed tap). */
export function getGuestMapClickCount(): number {
  return loadClickCount();
}

export function isUsageLimitReached(): boolean {
  return loadClickCount() >= FREE_CHECK_LIMIT;
}

/** Block status fetches only after all free taps are exhausted (not on the last allowed tap). */
export function shouldBlockGuestStatusFetch(): boolean {
  return loadClickCount() > FREE_CHECK_LIMIT;
}

/**
 * Consume one free guest map check on tap. Returns whether the tap is allowed
 * and the new total (after increment when allowed).
 */
export function tryConsumeGuestMapClick(): {
  allowed: boolean;
  count: number;
} {
  const current = loadClickCount();
  if (current >= FREE_CHECK_LIMIT) {
    return { allowed: false, count: current };
  }
  const count = current + 1;
  saveClickCount(count);
  return { allowed: true, count };
}

/** @deprecated Use tryConsumeGuestMapClick on map tap. Kept for compatibility. */
export function recordLocationCheck(_lat: number, _lng: number): number {
  const { count } = tryConsumeGuestMapClick();
  return count;
}

export function snoozeAuthPrompt(): void {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
}

function isAuthPromptSnoozed(): boolean {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export function shouldShowUsageBanner(isLoggedIn: boolean): boolean {
  if (isLoggedIn) return false;
  if (isAuthPromptSnoozed()) return false;
  return isUsageLimitReached();
}

export function clearGuestUsageOnLogin(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CLICKS_KEY);
    localStorage.removeItem(LEGACY_CHECKS_KEY);
    localStorage.removeItem(SNOOZE_KEY);
    window.dispatchEvent(new Event(USAGE_GATE_EVENT));
  } catch {
    /* ignore */
  }
}
