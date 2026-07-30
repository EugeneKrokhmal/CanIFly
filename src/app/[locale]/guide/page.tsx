import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideCountryContent } from "@/components/content/GuideCountryContent";
import {
  absoluteUrl,
  buildPageMetadata,
  getSiteUrl,
  jsonLdScript,
} from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("guideTitle"),
    description: t("guideDescription"),
    path: "/guide",
  });
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guide");
  const appLocale = locale as AppLocale;
  const url = absoluteUrl(appLocale, "/guide");

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: t("byCountry.ES.title"),
    description: t("byCountry.ES.intro"),
    inLanguage:
      appLocale === "es"
        ? "es-ES"
        : appLocale === "pl"
          ? "pl-PL"
          : appLocale === "cs"
            ? "cs-CZ"
            : "en",
    author: { "@type": "Organization", name: "CanIFly", url: getSiteUrl() },
    publisher: {
      "@type": "Organization",
      name: "CanIFly",
      url: getSiteUrl(),
      logo: { "@type": "ImageObject", url: `${getSiteUrl()}/icon.svg` },
    },
    mainEntityOfPage: url,
    about: {
      "@type": "Thing",
      name:
        appLocale === "es"
          ? "Espacio aéreo UAS en la UE (España, Chequia y Polonia)"
          : appLocale === "pl"
            ? "Przestrzeń powietrzna UAS w UE (Hiszpania, Czechy i Polska)"
            : appLocale === "cs"
              ? "Vzdušný prostor UAS v EU (Španělsko, Česko a Polsko)"
              : "UAS airspace in the EU (Spain, Germany, France, Czechia and Poland)",
    },
  };

  return (
    <article className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(articleLd)}
      />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <GuideCountryContent />
      </div>
    </article>
  );
}
