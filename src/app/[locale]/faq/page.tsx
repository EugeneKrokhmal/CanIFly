import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

const FAQ_KEYS = ["status", "auth", "data", "track", "official"] as const;

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");

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

        <ul className="mt-8 space-y-3">
          {FAQ_KEYS.map((key) => (
            <li
              key={key}
              className="rounded-2xl border border-[#ebebeb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-[16px] font-semibold leading-snug text-[#222222]">
                {t(`items.${key}.q`)}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[#717171]">
                {t(`items.${key}.a`)}
              </p>
            </li>
          ))}
        </ul>

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
