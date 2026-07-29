import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";
import VerifyEmailPage from "./VerifyEmailClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "verifyEmail" });
  return buildPageMetadata({
    locale,
    title: `${t("title")} | CanIFly`,
    description: t("checking"),
    path: "/verify-email",
    noIndex: true,
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("verifyEmail");

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[var(--as-surface-muted)] text-sm text-[var(--as-ink-soft)]">
          {t("checking")}
        </div>
      }
    >
      <VerifyEmailPage />
    </Suspense>
  );
}
