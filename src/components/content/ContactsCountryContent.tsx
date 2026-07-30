"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CountrySelect, type ContentCountryId } from "./CountrySelect";

type ContactLink = {
  key: string;
  href: string;
  label: string;
};

const CONTACT_LINKS: Record<ContentCountryId, readonly ContactLink[]> = {
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
      href: "https://ulc.gov.pl/pl/drony",
      label: "ulc.gov.pl",
    },
    {
      key: "pansa",
      href: "https://www.pansa.pl/kontakt/",
      label: "pansa.pl",
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

export function ContactsCountryContent() {
  const t = useTranslations("contacts");
  const [country, setCountry] = useState<ContentCountryId>("ES");
  const links = CONTACT_LINKS[country];

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
