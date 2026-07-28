import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <div className="h-full overflow-y-auto bg-[#f7f7f7] text-[#222222]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="text-[12px] font-semibold text-[#717171]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[#222222] sm:text-[32px]">
          {t("title")}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[#717171]">
          {t("intro")}
        </p>

        <section className="mt-8 rounded-2xl border border-[#ebebeb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold">{t("storeTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-relaxed text-[#717171]">
            <li>
              <span className="font-medium text-[#222222]">
                {t("storeEssentialLabel")}
              </span>{" "}
              {t("storeEssential")}
            </li>
            <li>
              <span className="font-medium text-[#222222]">
                {t("storeOptionalLabel")}
              </span>{" "}
              {t("storeOptional")}
            </li>
          </ul>
        </section>

        <section className="mt-3 rounded-2xl border border-[#ebebeb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold">{t("thirdTitle")}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#717171]">
            {t("thirdBody")}
          </p>
        </section>

        <section className="mt-3 rounded-2xl border border-[#ebebeb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-semibold">{t("choicesTitle")}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#717171]">
            {t("choicesBodyBefore")}
            <strong className="font-semibold text-[#222222]">
              {t("choicesReject")}
            </strong>
            {t("choicesBodyMid")}
            <strong className="font-semibold text-[#222222]">
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
