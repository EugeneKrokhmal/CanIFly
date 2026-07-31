import { Suspense } from "react";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { COUNTRY_IDS, type CountryId } from "@canifly/middleware";
import { resolveLiveCountryFromIpHeaders } from "@/lib/geo/ip-country";
import HomePageClient from "./HomePageClient";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const LIVE = new Set<string>(COUNTRY_IDS);

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("map");

  const sp = await searchParams;
  const lat = Number(firstParam(sp.lat));
  const lng = Number(firstParam(sp.lng));
  const hasDeepLink =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  const countryParam = firstParam(sp.country)?.trim().toUpperCase();
  const countryFromQuery =
    countryParam && LIVE.has(countryParam)
      ? (countryParam as CountryId)
      : null;

  // Soft country frame: ?country= wins, else CDN IP geo. Skipped for ?lat=&lng=.
  const ipCountry = hasDeepLink
    ? null
    : (countryFromQuery ??
      resolveLiveCountryFromIpHeaders(await headers()));

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[var(--as-map-bg)] text-sm text-[var(--as-ink-soft)]">
          {t("loading")}
        </div>
      }
    >
      <HomePageClient ipCountry={ipCountry} />
    </Suspense>
  );
}
