"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CountrySelect, type ContentCountryId } from "./CountrySelect";
import { ulcDronesLabel, ulcDronesUrl } from "@/lib/official-links";

const FAQ_KEYS: Record<ContentCountryId, readonly string[]> = {
  ES: [
    "status",
    "auth",
    "openCategory",
    "where",
    "madrid",
    "data",
    "track",
    "official",
  ],
  DE: [
    "status",
    "auth",
    "openCategory",
    "where",
    "berlin",
    "data",
    "track",
    "official",
  ],
  FR: [
    "status",
    "auth",
    "openCategory",
    "where",
    "paris",
    "data",
    "track",
    "official",
  ],
  DK: [
    "status",
    "auth",
    "openCategory",
    "where",
    "copenhagen",
    "data",
    "track",
    "official",
  ],
  CH: [
    "status",
    "auth",
    "openCategory",
    "where",
    "zurich",
    "data",
    "track",
    "official",
  ],
  PT: [
    "status",
    "auth",
    "openCategory",
    "where",
    "lisbon",
    "data",
    "track",
    "official",
  ],
  AT: [
    "status",
    "auth",
    "openCategory",
    "where",
    "vienna",
    "data",
    "track",
    "official",
  ],
  SE: [
    "status",
    "auth",
    "openCategory",
    "where",
    "stockholm",
    "data",
    "track",
    "official",
  ],
  CZ: [
    "status",
    "auth",
    "openCategory",
    "where",
    "prague",
    "data",
    "track",
    "official",
  ],
  PL: [
    "status",
    "auth",
    "openCategory",
    "where",
    "warsaw",
    "data",
    "track",
    "official",
  ],
};

export function FaqCountryContent() {
  const t = useTranslations("faq");
  const locale = useLocale();
  const [country, setCountry] = useState<ContentCountryId>("ES");
  const keys = FAQ_KEYS[country];
  const ulcHref = ulcDronesUrl(locale);
  const ulcLabel = ulcDronesLabel(locale);

  return (
    <>
      <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[32px]">
        {t(`byCountry.${country}.title`)}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
        {t(`byCountry.${country}.intro`)}
      </p>

      <CountrySelect
        value={country}
        onChange={setCountry}
        label={t("countryLabel")}
        names={{
          ES: t("countryNames.ES"),
          DE: t("countryNames.DE"),
          FR: t("countryNames.FR"),
          DK: t("countryNames.DK"),
          CH: t("countryNames.CH"),
          PT: t("countryNames.PT"),
          AT: t("countryNames.AT"),
          SE: t("countryNames.SE"),
          CZ: t("countryNames.CZ"),
          PL: t("countryNames.PL"),
        }}
      />

      <ul className="mt-8 space-y-3">
        {keys.map((key) => (
          <li
            key={`${country}-${key}`}
            className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <h2 className="text-[16px] font-semibold leading-snug text-[var(--as-ink)]">
              {t(`byCountry.${country}.items.${key}.q`)}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t(`byCountry.${country}.items.${key}.a`)}
            </p>
            {country === "PL" && key === "official" ? (
              <a
                href={ulcHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[14px] font-semibold text-[#ff385c] hover:underline"
              >
                {ulcLabel} ↗
              </a>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-8">
        <Link
          href="/guide"
          className="text-[14px] font-semibold text-[#ff385c] hover:underline"
        >
          {t(`byCountry.${country}.ctaGuide`)}
        </Link>
      </p>

      <p className="mt-4">
        <Link
          href="/"
          className="text-[14px] font-medium text-[var(--as-ink-soft)] hover:underline"
        >
          {t("backToMap")}
        </Link>
      </p>
    </>
  );
}
