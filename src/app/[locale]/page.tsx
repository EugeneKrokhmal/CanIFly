import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import HomePageClient from "./HomePageClient";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("map");

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#ebebeb] text-sm text-[#717171]">
          {t("loading")}
        </div>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
