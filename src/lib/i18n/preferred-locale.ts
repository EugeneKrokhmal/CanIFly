import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

const APP_LOCALES = new Set<string>(routing.locales);

/**
 * Map CDN IP country → UI / email locale.
 * Only countries we can serve meaningfully; others return null (keep negotiation).
 */
export function localeFromCountryCode(
  country: string | null | undefined,
): AppLocale | null {
  const cc = (country ?? "").trim().toUpperCase();
  if (!cc || cc === "XX" || cc === "T1") return null;

  switch (cc) {
    case "ES":
      return "es";
    case "PL":
      return "pl";
    case "CZ":
    case "SK":
      return "cs";
    case "DE":
    case "AT":
      return "de";
    case "CH":
      // Default Swiss UI to German; users can switch.
      return "de";
    case "FR":
    case "BE":
    case "LU":
      return "fr";
    case "GB":
    case "IE":
    case "US":
    case "CA":
    case "AU":
    case "NZ":
    case "PT":
    case "DK":
    case "SE":
    case "NO":
    case "FI":
    case "NL":
    case "LV":
    case "LT":
    case "EE":
    case "IT":
      return "en";
    default:
      return null;
  }
}

export function countryFromRequestHeaders(
  headers: Headers | { get(name: string): string | null },
): string | null {
  const raw = (
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    ""
  )
    .trim()
    .toUpperCase();
  if (!raw || raw === "XX" || raw === "T1") return null;
  return raw;
}

/** Primary browser language if it is one of our app locales. */
export function localeFromNavigatorLanguages(
  languages: readonly string[] | string | null | undefined,
): AppLocale | null {
  const list = Array.isArray(languages)
    ? languages
    : typeof languages === "string"
      ? [languages]
      : [];
  for (const raw of list) {
    const base = raw.trim().toLowerCase().split("-")[0];
    if (base && APP_LOCALES.has(base)) return base as AppLocale;
  }
  return null;
}

/**
 * Locale to persist on register / Google when the URL may still be default `es`
 * (common for PL/DE visitors hitting canifly.org from ads).
 */
export function preferredRegisterLocale(uiLocale: AppLocale): AppLocale {
  if (uiLocale !== routing.defaultLocale) return uiLocale;
  if (typeof navigator === "undefined") return uiLocale;
  const fromNav = localeFromNavigatorLanguages(navigator.languages ?? [
    navigator.language,
  ]);
  if (fromNav && fromNav !== routing.defaultLocale) return fromNav;
  return uiLocale;
}
