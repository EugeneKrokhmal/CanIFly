import { COUNTRY_IDS, type CountryId } from "@canifly/middleware";

const LIVE = new Set<string>(COUNTRY_IDS);

/**
 * Resolve visitor country from CDN / platform geo headers.
 * Works on Vercel (`x-vercel-ip-country`) and Cloudflare (`cf-ipcountry`).
 * Returns only countries CanIFly covers live; otherwise null (keep default ES).
 */
export function resolveLiveCountryFromIpHeaders(
  headers: Headers | { get(name: string): string | null },
): CountryId | null {
  const raw = (
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    ""
  )
    .trim()
    .toUpperCase();

  // Cloudflare uses XX (unknown) and T1 (Tor).
  if (!raw || raw === "XX" || raw === "T1") return null;
  return LIVE.has(raw) ? (raw as CountryId) : null;
}
