"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BackToMapLink } from "@/components/layout/BackToMapLink";
import { CountrySelect, type ContentCountryId } from "./CountrySelect";
import { ulcDronesLabel, ulcDronesUrl } from "@/lib/official-links";

const SECTION_KEYS: Record<ContentCountryId, readonly string[]> = {
  ES: ["how", "enaire", "aesa", "cities", "community", "disclaimer"],
  DE: ["how", "dipul", "dfs", "cities", "community", "disclaimer"],
  FR: ["how", "geoportail", "dgac", "cities", "community", "disclaimer"],
  DK: ["how", "dronezoner", "trafikstyrelsen", "cities", "community", "disclaimer"],
  CH: ["how", "foca", "bazl", "cities", "community", "disclaimer"],
  PT: ["how", "anac", "dnt", "cities", "community", "disclaimer"],
  AT: ["how", "dronespace", "austro", "cities", "community", "disclaimer"],
  SE: ["how", "dronechart", "transportstyrelsen", "cities", "community", "disclaimer"],
  IE: ["how", "iaa", "airnav", "cities", "community", "disclaimer"],
  LV: ["how", "airspace", "lgs", "cities", "community", "disclaimer"],
  LT: ["how", "utm", "ans", "cities", "community", "disclaimer"],
  EE: ["how", "utm", "eans", "cities", "community", "disclaimer"],
  SK: ["how", "nsat", "caa", "cities", "community", "disclaimer"],
  SI: ["how", "caa", "zones", "cities", "community", "disclaimer"],
  CZ: ["how", "anscr", "caa", "cities", "community", "disclaimer"],
  PL: ["how", "pansa", "ulc", "cities", "community", "disclaimer"],
};

type SectionLink = { href: string; label: string };

function sectionLink(
  country: ContentCountryId,
  key: string,
  locale: string,
): SectionLink | null {
  if (country === "PL" && key === "ulc") {
    return { href: ulcDronesUrl(locale), label: ulcDronesLabel(locale) };
  }
  if (country === "PL" && key === "pansa") {
    return { href: "https://dronemap.pansa.pl/", label: "dronemap.pansa.pl" };
  }
  if (country === "FR" && key === "geoportail") {
    return {
      href: "https://www.geoportail.gouv.fr/donnees/restrictions-pour-drones-de-loisir",
      label: "geoportail.gouv.fr",
    };
  }
  if (country === "DK" && key === "dronezoner") {
    return { href: "https://dronezoner.dk/", label: "dronezoner.dk" };
  }
  if (country === "CH" && key === "foca") {
    return {
      href: "https://map.geo.admin.ch/?topic=ech&layers=ch.bazl.einschraenkungen-drohnen",
      label: "map.geo.admin.ch",
    };
  }
  if (country === "PT" && key === "anac") {
    return { href: "https://dnt.anac.pt/mapa.html", label: "dnt.anac.pt" };
  }
  if (country === "AT" && key === "dronespace") {
    return { href: "https://dronespace.at/", label: "dronespace.at" };
  }
  if (country === "SE" && key === "dronechart") {
    return { href: "https://dronechart.lfv.se/", label: "dronechart.lfv.se" };
  }
  if (country === "IE" && key === "iaa") {
    return {
      href: "https://www.iaa.ie/general-aviation/drones/uas-geographic-zones",
      label: "iaa.ie — UAS zones",
    };
  }
  if (country === "LV" && key === "airspace") {
    return { href: "https://www.airspace.lv/drones/", label: "airspace.lv/drones" };
  }
  if (country === "LT" && key === "utm") {
    return { href: "https://utm.ans.lt/avm/", label: "utm.ans.lt — Lithuania Drone Map" };
  }
  if (country === "EE" && key === "utm") {
    return { href: "https://utm.eans.ee/avm/", label: "utm.eans.ee — drone map" };
  }
  if (country === "SK" && key === "nsat") {
    return {
      href: "https://letectvo.nsat.sk/en/unmanned-aviation/geo-zones/",
      label: "letectvo.nsat.sk — geo-zones",
    };
  }
  if (country === "SI" && key === "caa") {
    return {
      href: "https://www.caa.si/en/geographical-restrictions-for-uas.html",
      label: "caa.si — UAS geographical restrictions",
    };
  }
  return null;
}

export function GuideCountryContent() {
  const t = useTranslations("guide");
  const locale = useLocale();
  const [country, setCountry] = useState<ContentCountryId>("ES");
  const keys = SECTION_KEYS[country];

  return (
    <>
      <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
        {t(`byCountry.${country}.eyebrow`)}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[32px]">
        {t(`byCountry.${country}.title`)}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
        {t(`byCountry.${country}.intro`)}
      </p>

      <Link
        href="/guide/flights"
        className="as-press mt-5 flex items-start gap-3 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-4 shadow-[var(--as-shadow)] hover:bg-[var(--as-hover)]"
      >
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--as-rausch-soft)] text-[14px] font-bold text-[var(--as-rausch)]">
          DJI
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-[var(--as-ink)]">
            {t("flightsGuideCta")}
          </span>
          <span className="mt-0.5 block text-[13px] leading-snug text-[var(--as-ink-soft)]">
            {t("flightsGuideBlurb")}
          </span>
        </span>
      </Link>

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
          IE: t("countryNames.IE"),
          LV: t("countryNames.LV"),
          LT: t("countryNames.LT"),
          EE: t("countryNames.EE"),
          SK: t("countryNames.SK"),
          SI: t("countryNames.SI"),
          CZ: t("countryNames.CZ"),
          PL: t("countryNames.PL"),
        }}
      />

      <div className="mt-8 space-y-5">
        {keys.map((key) => {
          const ext = sectionLink(country, key, locale);
          return (
            <section
              key={`${country}-${key}`}
              className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-[16px] font-semibold leading-snug text-[var(--as-ink)]">
                {t(`byCountry.${country}.sections.${key}.title`)}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
                {t(`byCountry.${country}.sections.${key}.body`)}
              </p>
              {ext ? (
                <a
                  href={ext.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-[14px] font-semibold text-[#ff385c] hover:underline"
                >
                  {ext.label} ↗
                </a>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-[#ff385c] px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          {t("ctaMap")}
        </Link>
        <Link
          href="/faq"
          className="rounded-full border border-[var(--as-line-soft)] bg-[var(--as-surface)] px-5 py-2.5 text-[14px] font-semibold text-[var(--as-ink)]"
        >
          {t("ctaFaq")}
        </Link>
      </div>

      <BackToMapLink namespace="guide" />
    </>
  );
}
