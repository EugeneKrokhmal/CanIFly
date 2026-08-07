import { getTranslations, setRequestLocale } from "next-intl/server";
import { LandingContent } from "@/components/content/LandingContent";
import { buildPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("landingTitle"),
    description: t("landingDescription"),
    path: "/landing",
    ogImagePath: "/landing/hero-1280.jpg",
  });
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      {/* Warm the scrub encode while the poster paints (responsive sources). */}
      <link
        rel="preload"
        as="video"
        href="/landing/clip-coast-mobile.mp4?v=scrub19"
        type="video/mp4"
        media="(max-width: 767px)"
      />
      <link
        rel="preload"
        as="video"
        href="/landing/clip-coast.mp4?v=scrub19"
        type="video/mp4"
        media="(min-width: 768px)"
      />
      <LandingContent locale={locale as AppLocale} />
    </>
  );
}
