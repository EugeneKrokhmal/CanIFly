import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BackToMapLink } from "@/components/layout/BackToMapLink";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("termsTitle"),
    description: t("termsDescription"),
    path: "/terms",
  });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
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

        <section className="mt-8 space-y-6 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div>
            <h2 className="text-[16px] font-semibold">{t("serviceTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("serviceBody")}
            </p>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">{t("accountTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("accountBody")}
            </p>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">{t("contentTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("contentBody")}
            </p>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">{t("liabilityTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("liabilityBody")}
            </p>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">{t("privacyTitle")}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t.rich("privacyBody", {
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    className="font-semibold text-[var(--as-ink)] underline underline-offset-2"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </div>
        </section>

        <BackToMapLink namespace="terms" />
      </div>
    </div>
  );
}
