import { getTranslations } from "next-intl/server";
import { LandingScrollVideoBg } from "@/components/content/LandingScrollVideoBg";
import {
  LandingStorySlides,
  type LandingSlide,
} from "@/components/content/LandingStorySlides";
import {
  absoluteUrl,
  getSiteUrl,
  jsonLdScript,
} from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export async function LandingContent({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("landing");
  const url = absoluteUrl(locale, "/landing");

  const slides: LandingSlide[] = [
    {
      id: "intro",
      showBrand: true,
      title: t("headline"),
      body: t("subhead"),
      primaryCta: t("ctaMap"),
      secondaryCta: t("ctaGuide"),
    },
    {
      id: "plan",
      eyebrow: "CanIFly",
      title: t("planTitle"),
      body: t("planP1"),
      steps: [t("howStep1"), t("howStep2"), t("howStep3")],
    },
    {
      id: "status",
      eyebrow: "CanIFly",
      title: t("statusTitle"),
      body: t("statusP1"),
    },
    {
      id: "trust",
      eyebrow: "CanIFly",
      title: t("trustTitle"),
      body: t("trustP1"),
    },
    {
      id: "community",
      eyebrow: "CanIFly",
      title: t("communityTitle"),
      body: t("communityP1"),
    },
    {
      id: "seo",
      eyebrow: "CanIFly",
      title: t("seoTitle"),
      body: t("seoP1"),
      primaryCta: t("ctaMap"),
      footnote: t("disclaimer"),
    },
  ];

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: t("headline"),
    description: t("subhead"),
    isPartOf: { "@id": `${getSiteUrl()}/#website` },
    about: {
      "@type": "Thing",
      name: t("aboutName"),
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${getSiteUrl()}/landing/clip-coast-poster.jpg`,
    },
  };

  return (
    <LandingScrollVideoBg
      src="/landing/clip-coast.mp4"
      srcMobile="/landing/clip-coast-mobile.mp4"
      poster="/landing/clip-coast-poster.jpg"
      label={t("heroAlt")}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(webPageLd)}
      />
      <LandingStorySlides slides={slides} backLabel={t("backToMap")} />
    </LandingScrollVideoBg>
  );
}
