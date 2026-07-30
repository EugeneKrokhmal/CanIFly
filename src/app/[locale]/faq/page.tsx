import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { FaqCountryContent } from "@/components/content/FaqCountryContent";
import { buildPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

const FAQ_KEYS_ES = [
  "status",
  "auth",
  "openCategory",
  "where",
  "madrid",
  "data",
  "track",
  "official",
] as const;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("faqTitle"),
    description: t("faqDescription"),
    path: "/faq",
  });
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const appLocale = locale as AppLocale;

  const faqItems = FAQ_KEYS_ES.map((key) => ({
    question: t(`byCountry.ES.items.${key}.q`),
    answer: t(`byCountry.ES.items.${key}.a`),
  }));

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <SiteJsonLd locale={appLocale} faqItems={faqItems} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <FaqCountryContent />
      </div>
    </div>
  );
}
