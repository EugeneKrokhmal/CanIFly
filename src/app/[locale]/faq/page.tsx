import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteJsonLd } from "@/components/seo/SiteJsonLd";
import { buildPageMetadata } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

const FAQ_KEYS = [
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

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`items.${key}.q`),
    answer: t(`items.${key}.a`),
  }));

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <SiteJsonLd locale={appLocale} faqItems={faqItems} />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[32px]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("intro")}
        </p>

        <ul className="mt-8 space-y-3">
          {FAQ_KEYS.map((key) => (
            <li
              key={key}
              className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-[16px] font-semibold leading-snug text-[var(--as-ink)]">
                {t(`items.${key}.q`)}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
                {t(`items.${key}.a`)}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-8">
          <Link
            href="/guide"
            className="text-[14px] font-semibold text-[#ff385c] hover:underline"
          >
            {t("ctaGuide")}
          </Link>
        </p>

        <Link
          href="/"
          className="mt-4 inline-block text-[14px] font-semibold text-[var(--as-ink-soft)] hover:underline"
        >
          {t("backToMap")}
        </Link>
      </div>
    </div>
  );
}
