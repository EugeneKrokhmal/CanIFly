"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useThemeStore } from "@/stores/theme";
import type { ThemePreference } from "@/lib/theme-boot";

function SegmentedOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="as-press flex-1 rounded-full px-3 py-2.5 text-[13px] font-semibold"
      style={{
        color: active ? "var(--as-ink)" : "var(--as-ink-soft)",
        background: active ? "var(--as-hover)" : "transparent",
        boxShadow: active ? "inset 0 0 0 1px var(--as-ink)" : undefined,
      }}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function SettingsForm() {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  const switchLocale = (next: "es" | "en") => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  const themes: { id: ThemePreference; label: string }[] = [
    { id: "system", label: tNav("themeSystem") },
    { id: "light", label: tNav("themeLight") },
    { id: "dark", label: tNav("themeDark") },
  ];

  return (
    <div className="mt-8 space-y-4">
      <section className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-[16px] font-semibold text-[var(--as-ink)]">
          {t("languageTitle")}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("languageHint")}
        </p>
        <div
          className="mt-4 flex items-center gap-1 rounded-full border border-[var(--as-line)] p-0.5"
          role="group"
          aria-label={t("languageTitle")}
        >
          <SegmentedOption
            active={locale === "es"}
            onClick={() => switchLocale("es")}
          >
            {t("langEs")}
          </SegmentedOption>
          <SegmentedOption
            active={locale === "en"}
            onClick={() => switchLocale("en")}
          >
            {t("langEn")}
          </SegmentedOption>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-[16px] font-semibold text-[var(--as-ink)]">
          {t("themeTitle")}
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("themeHint")}
        </p>
        <div
          className="mt-4 flex items-center gap-1 rounded-full border border-[var(--as-line)] p-0.5"
          role="group"
          aria-label={t("themeTitle")}
        >
          {themes.map((opt) => (
            <SegmentedOption
              key={opt.id}
              active={preference === opt.id}
              onClick={() => setPreference(opt.id)}
            >
              {opt.label}
            </SegmentedOption>
          ))}
        </div>
      </section>
    </div>
  );
}
