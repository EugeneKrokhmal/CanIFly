import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

const CONTACT_KEYS = [
  {
    key: "planea" as const,
    href: "https://planea.enaire.es/nsf/login",
    label: "planea.enaire.es",
  },
  {
    key: "drones" as const,
    href: "https://drones.enaire.es/",
    label: "drones.enaire.es",
  },
  {
    key: "aesa" as const,
    href: "https://www.seguridadaerea.gob.es/es/ambitos/drones",
    label: "seguridadaerea.gob.es",
  },
  {
    key: "aip" as const,
    href: "https://aip.enaire.es/AIP/UAS-en.html",
    label: "aip.enaire.es",
  },
];

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contacts");

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
          {CONTACT_KEYS.map((c) => (
            <li
              key={c.key}
              className="rounded-2xl border border-[#ebebeb] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              <h2 className="text-[16px] font-semibold text-[#222222]">
                {t(`items.${c.key}.title`)}
              </h2>
              <p className="mt-1 text-[14px] leading-relaxed text-[#717171]">
                {t(`items.${c.key}.detail`)}
              </p>
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[14px] font-semibold text-[#ff385c] hover:underline"
              >
                {c.label} ↗
              </a>
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
