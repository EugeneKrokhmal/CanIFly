import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

const SECTION_KEYS = [
  "how",
  "enaire",
  "aesa",
  "cities",
  "community",
  "disclaimer",
] as const;

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
    headline: t("title"),
    description: t("intro"),
    inLanguage: appLocale === "es" ? "es-ES" : "en",
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
          ? "Espacio aéreo UAS en España"
          : "UAS airspace in Spain",
    },
  };

  return (
    <article className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(articleLd)}
      />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[32px]">
          {t("title")}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("intro")}
        </p>

        <div className="mt-8 space-y-5">
          {SECTION_KEYS.map((key) => (
            <section
              key={key}
              className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-[16px] font-semibold leading-snug text-[var(--as-ink)]">
                {t(`sections.${key}.title`)}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
                {t(`sections.${key}.body`)}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="as-press inline-flex rounded-full bg-[var(--as-ink)] px-4 py-2.5 text-[13px] font-semibold text-[var(--as-ink-invert)]"
          >
            {t("ctaMap")}
          </Link>
          <Link
            href="/faq"
            className="as-press inline-flex rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] px-4 py-2.5 text-[13px] font-semibold text-[var(--as-ink)]"
          >
            {t("ctaFaq")}
          </Link>
        </div>

        <Link
          href="/"
          className="mt-6 inline-block text-[14px] font-semibold text-[var(--as-ink-soft)] hover:underline"
        >
          {t("backToMap")}
        </Link>
      </div>
    </article>
  );
}
