/** First-run product tour — client-only localStorage flags. */

const PENDING_KEY = "canifly-tour-pending";
const DONE_PREFIX = "canifly-tour-done:";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function markTourPending(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PENDING_KEY, "1");
  } catch {
    // private mode / quota
  }
}

export function clearTourPending(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

export function isTourPending(): boolean {
  if (!canUseStorage()) return false;
  try {
    return localStorage.getItem(PENDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function isTourDone(userId: string): boolean {
  if (!canUseStorage() || !userId) return false;
  try {
    return localStorage.getItem(`${DONE_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function markTourDone(userId: string): void {
  if (!canUseStorage() || !userId) return;
  try {
    localStorage.setItem(`${DONE_PREFIX}${userId}`, "1");
    localStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

export function shouldStartTour(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (isTourDone(userId)) return false;
  return isTourPending();
}
