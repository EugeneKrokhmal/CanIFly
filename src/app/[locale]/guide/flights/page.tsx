import { getTranslations, setRequestLocale } from "next-intl/server";
import { GuideFlightsContent } from "@/components/content/GuideFlightsContent";
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
  const t = await getTranslations({ locale, namespace: "guideFlights" });
  return buildPageMetadata({
    locale,
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/guide/flights",
  });
}

export default async function GuideFlightsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guideFlights");
  const appLocale = locale as AppLocale;
  const url = absoluteUrl(appLocale, "/guide/flights");

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("title"),
    description: t("intro"),
    inLanguage:
      appLocale === "es"
        ? "es-ES"
        : appLocale === "de"
          ? "de-DE"
          : appLocale === "fr"
            ? "fr-FR"
            : appLocale === "pl"
              ? "pl-PL"
              : appLocale === "cs"
                ? "cs-CZ"
                : "en",
    author: { "@type": "Organization", name: "CanIFly", url: getSiteUrl() },
    step: [
      {
        "@type": "HowToStep",
        name: t("ios.s1Title"),
        text: t("ios.s1Body"),
      },
      {
        "@type": "HowToStep",
        name: t("upload.s1Title"),
        text: t("upload.s1Body"),
      },
      {
        "@type": "HowToStep",
        name: t("upload.s3Title"),
        text: t("upload.s3Body"),
      },
    ],
  };

  return (
    <article className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(howToLd)}
      />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <GuideFlightsContent />
      </div>
    </article>
  );
}
