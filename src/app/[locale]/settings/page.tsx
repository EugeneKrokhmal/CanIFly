import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackToMapLink } from "@/components/layout/BackToMapLink";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return buildPageMetadata({
    locale,
    title: t("settingsTitle"),
    description: t("settingsDescription"),
    path: "/settings",
  });
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("settings");

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

        <SettingsForm />

        <BackToMapLink namespace="settings" />
      </div>
    </div>
  );
}
