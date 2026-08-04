import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FREE_CHECK_LIMIT,
  clearGuestUsageOnLogin,
  getGuestMapClickCount,
  isUsageLimitReached,
  shouldBlockGuestStatusFetch,
  shouldShowUsageBanner,
  tryConsumeGuestMapClick,
} from "./usage-gate";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  vi.stubGlobal("window", {
    dispatchEvent: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usage-gate", () => {
  it("allows three map taps then blocks the fourth", () => {
    expect(getGuestMapClickCount()).toBe(0);

    for (let i = 1; i <= FREE_CHECK_LIMIT; i++) {
      const result = tryConsumeGuestMapClick();
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(i);
      expect(isUsageLimitReached()).toBe(i === FREE_CHECK_LIMIT);
      expect(shouldBlockGuestStatusFetch()).toBe(false);
    }

    const blocked = tryConsumeGuestMapClick();
    expect(blocked.allowed).toBe(false);
    expect(blocked.count).toBe(FREE_CHECK_LIMIT);
    expect(shouldBlockGuestStatusFetch()).toBe(false);
  });

  it("shows usage banner only after three taps", () => {
    expect(shouldShowUsageBanner(false)).toBe(false);
    tryConsumeGuestMapClick();
    tryConsumeGuestMapClick();
    expect(shouldShowUsageBanner(false)).toBe(false);
    tryConsumeGuestMapClick();
    expect(shouldShowUsageBanner(false)).toBe(true);
    expect(shouldShowUsageBanner(true)).toBe(false);
  });

  it("clears guest usage on login", () => {
    tryConsumeGuestMapClick();
    tryConsumeGuestMapClick();
    tryConsumeGuestMapClick();
    expect(isUsageLimitReached()).toBe(true);

    clearGuestUsageOnLogin();

    expect(getGuestMapClickCount()).toBe(0);
    expect(isUsageLimitReached()).toBe(false);
    expect(tryConsumeGuestMapClick().allowed).toBe(true);
  });

  it("migrates legacy unique-location keys into click count", () => {
    store.set(
      "canifly-location-checks",
      JSON.stringify(["1,2", "3,4", "5,6"]),
    );

    expect(getGuestMapClickCount()).toBe(3);
    expect(isUsageLimitReached()).toBe(true);
    expect(tryConsumeGuestMapClick().allowed).toBe(false);
  });
});
