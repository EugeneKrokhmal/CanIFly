const CHECKS_KEY = "canifly-location-checks";
const SNOOZE_KEY = "canifly-auth-snooze-until";

export const FREE_CHECK_LIMIT = 3;
export const USAGE_GATE_EVENT = "canifly-usage-gate-update";

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function roundCoord(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function loadChecks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHECKS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function recordLocationCheck(lat: number, lng: number): number {
  const key = `${roundCoord(lat)},${roundCoord(lng)}`;
  const checks = loadChecks();
  if (!checks.includes(key)) {
    checks.push(key);
    localStorage.setItem(CHECKS_KEY, JSON.stringify(checks));
    window.dispatchEvent(new Event(USAGE_GATE_EVENT));
  }
  return checks.length;
}

export function isUsageLimitReached(): boolean {
  return loadChecks().length >= FREE_CHECK_LIMIT;
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
