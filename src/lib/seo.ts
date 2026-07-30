import type { Metadata } from "next";
import { routing, type AppLocale } from "@/i18n/routing";

/** Production site origin (no trailing slash). */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    "https://canifly.org";
  return raw.replace(/\/$/, "");
}

export function localePath(locale: AppLocale, path = "/"): string {
  const normalized = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) {
    return normalized || "/";
  }
  return `/${locale}${normalized || ""}`;
}

export function absoluteUrl(locale: AppLocale, path = "/"): string {
  const p = localePath(locale, path);
  return `${getSiteUrl()}${p === "/" ? "" : p}` || getSiteUrl();
}

export function languageAlternates(path = "/"): Metadata["alternates"] {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, path);
  }
  languages["x-default"] = absoluteUrl(routing.defaultLocale, path);
  return {
    canonical: absoluteUrl(routing.defaultLocale, path),
    languages,
  };
}

const OG_LOCALE: Record<AppLocale, string> = {
  es: "es_ES",
  en: "en_GB",
  pl: "pl_PL",
};

const KEYWORDS: Record<AppLocale, string[]> = {
  es: [
    "dron España",
    "espacio aéreo UAS",
    "ENAIRE drones",
    "AESA UAS",
    "puedo volar dron",
    "zonas UAS",
    "CanIFly",
    "mapa drones España",
    "dron Polonia",
    "categoría abierta C0 C1 C2",
  ],
  en: [
    "drone Spain",
    "drone Poland",
    "UAS airspace",
    "ENAIRE drones",
    "PANSA DroneMap",
    "AESA UAS",
    "can I fly drone",
    "UAS geographical zones",
    "CanIFly",
    "open category C0 C1 C2",
  ],
  pl: [
    "dron Polska",
    "przestrzeń powietrzna UAS",
    "PANSA DroneMap",
    "ULC drony",
    "czy mogę latać dronem",
    "strefy UAS",
    "CanIFly",
    "mapa dronów Polska",
    "kategoria otwarta C0 C1 C2",
  ],
};

export function buildPageMetadata(input: {
  locale: string;
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
  ogImagePath?: string;
}): Metadata {
  const locale = (
    routing.locales.includes(input.locale as AppLocale)
      ? input.locale
      : routing.defaultLocale
  ) as AppLocale;
  const path = input.path ?? "/";
  const url = absoluteUrl(locale, path);
  // OG image lives at app root (`/opengraph-image`), not under a locale prefix.
  const ogImage = `${getSiteUrl()}${input.ogImagePath ?? "/opengraph-image"}`;
  const alternateLocale = routing.locales
    .filter((l) => l !== locale)
    .map((l) => OG_LOCALE[l]);

  return {
    metadataBase: new URL(getSiteUrl()),
    title: input.title,
    description: input.description,
    applicationName: "CanIFly",
    authors: [{ name: "CanIFly" }],
    creator: "CanIFly",
    publisher: "CanIFly",
    category: "aviation",
    keywords: KEYWORDS[locale],
    alternates: {
      canonical: url,
      languages: languageAlternates(path)?.languages,
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale,
      url,
      siteName: "CanIFly",
      title: input.title,
      description: input.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "CanIFly — UAS airspace map for Spain and Poland",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
