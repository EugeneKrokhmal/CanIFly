"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CountrySelect, type ContentCountryId } from "./CountrySelect";
import { ulcDronesLabel, ulcDronesUrl } from "@/lib/official-links";

type ContactLink = {
  key: string;
  href: string;
  label: string;
};

function contactLinksFor(locale: string): Record<ContentCountryId, readonly ContactLink[]> {
  return {
  ES: [
    {
      key: "planea",
      href: "https://planea.enaire.es/nsf/login",
      label: "planea.enaire.es",
    },
    {
      key: "drones",
      href: "https://drones.enaire.es/",
      label: "drones.enaire.es",
    },
    {
      key: "aesa",
      href: "https://www.seguridadaerea.gob.es/es/ambitos/drones",
      label: "seguridadaerea.gob.es",
    },
    {
      key: "aip",
      href: "https://aip.enaire.es/AIP/UAS-en.html",
      label: "aip.enaire.es",
    },
  ],
  PL: [
    {
      key: "dronemap",
      href: "https://dronemap.pansa.pl/",
      label: "dronemap.pansa.pl",
    },
    {
      key: "dronyGov",
      href: "https://drony.gov.pl/",
      label: "drony.gov.pl",
    },
    {
      key: "ulc",
      href: ulcDronesUrl(locale),
      label: ulcDronesLabel(locale),
    },
    {
      key: "pansa",
      href: "https://www.pansa.pl/kontakt/",
      label: "pansa.pl",
    },
  ],
  DE: [
    {
      key: "dipul",
      href: "https://uas-operations.bund.de/",
      label: "uas-operations.bund.de",
    },
    {
      key: "wms",
      href: "https://uas-betrieb.de/geoservices/dipul/wms?service=WMS&version=1.3.0&request=GetCapabilities",
      label: "uas-betrieb.de (WMS)",
    },
    {
      key: "bmdv",
      href: "https://www.bmv.de/",
      label: "bmv.de",
    },
    {
      key: "lba",
      href: "https://www.lba.de/DE/Drohnen/Drohnen_node.html",
      label: "lba.de",
    },
  ],
  FR: [
    {
      key: "geoportail",
      href: "https://www.geoportail.gouv.fr/donnees/restrictions-pour-drones-de-loisir",
      label: "geoportail.gouv.fr",
    },
    {
      key: "sia",
      href: "https://www.sia.aviation-civile.gouv.fr/produits-numeriques-en-libre-disposition/donnees-zones-geographiques-uas.html",
      label: "sia.aviation-civile.gouv.fr",
    },
    {
      key: "dgac",
      href: "https://www.ecologie.gouv.fr/politiques-publiques/drones-usages-professionnels-loisir",
      label: "ecologie.gouv.fr",
    },
    {
      key: "alphatango",
      href: "https://alphatango.aviation-civile.gouv.fr/",
      label: "alphatango.aviation-civile.gouv.fr",
    },
  ],
  DK: [
    {
      key: "dronezoner",
      href: "https://dronezoner.dk/",
      label: "dronezoner.dk",
    },
    {
      key: "api",
      href: "https://dronezoner.eu/API/",
      label: "dronezoner.eu/API",
    },
    {
      key: "trafikstyrelsen",
      href: "https://www.trafikstyrelsen.dk/",
      label: "trafikstyrelsen.dk",
    },
    {
      key: "register",
      href: "https://www.trafikstyrelsen.dk/civil-luftfart/droner",
      label: "trafikstyrelsen.dk/droner",
    },
  ],
  CZ: [
    {
      key: "dronemap",
      href: "https://dronemap.gov.cz/",
      label: "dronemap.gov.cz",
    },
    {
      key: "aim",
      href: "https://aim.rlp.cz/?lang=en&p=uas-gz",
      label: "aim.rlp.cz",
    },
    {
      key: "caa",
      href: "https://www.caa.gov.cz/provoz/bezpilotni-letadla/",
      label: "caa.gov.cz",
    },
    {
      key: "ans",
      href: "https://www.rlp.cz/",
      label: "rlp.cz",
    },
  ],
  };
}

export function ContactsCountryContent() {
  const t = useTranslations("contacts");
  const locale = useLocale();
  const [country, setCountry] = useState<ContentCountryId>("ES");
  const links = contactLinksFor(locale)[country];

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
          CZ: t("countryNames.CZ"),
          PL: t("countryNames.PL"),
        }}
      />

      <ul className="mt-8 space-y-3">
        {links.map((c) => (
          <li
            key={`${country}-${c.key}`}
            className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <h2 className="text-[16px] font-semibold text-[var(--as-ink)]">
              {t(`byCountry.${country}.items.${c.key}.title`)}
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t(`byCountry.${country}.items.${c.key}.detail`)}
            </p>
            <a
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-[14px] font-semibold text-[#ff385c] hover:underline"
            >
              {c.label} ↗
            </a>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="mt-8 inline-block text-[14px] font-semibold text-[#ff385c] hover:underline"
      >
        {t("backToMap")}
      </Link>
    </>
  );
}
