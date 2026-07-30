import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buildPageMetadata } from "@/lib/seo";
import ResetPasswordClient from "./ResetPasswordClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "resetPassword" });
  return buildPageMetadata({
    locale,
    title: `${t("title")} | CanIFly`,
    description: t("blurb"),
    path: "/reset-password",
    noIndex: true,
  });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("resetPassword");

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[var(--as-surface-muted)] text-sm text-[var(--as-ink-soft)]">
          {t("pleaseWait")}
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}
