import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    path: "/privacy",
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

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

        <section className="mt-8 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold">{t("storeTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
            <li>
              <span className="font-medium text-[var(--as-ink)]">
                {t("storeEssentialLabel")}
              </span>{" "}
              {t("storeEssential")}
            </li>
            <li>
              <span className="font-medium text-[var(--as-ink)]">
                {t("storeOptionalLabel")}
              </span>{" "}
              {t("storeOptional")}
            </li>
          </ul>
        </section>

        <section className="mt-3 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold">{t("thirdTitle")}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
            {t("thirdBody")}
          </p>
        </section>

        <section className="mt-3 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold">{t("choicesTitle")}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
            {t("choicesBodyBefore")}
            <strong className="font-semibold text-[var(--as-ink)]">
              {t("choicesReject")}
            </strong>
            {t("choicesBodyMid")}
            <strong className="font-semibold text-[var(--as-ink)]">
              {t("choicesAccept")}
            </strong>
            {t("choicesBodyAfter")}
          </p>
        </section>

        <Link
          href="/"
          className="mt-8 inline-block text-[14px] font-semibold text-[#ff385c] hover:underline"
        >
          {t("backToMap")}
        </Link>
      </div>
    </div>
  );
}
