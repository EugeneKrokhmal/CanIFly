"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore, type AppLocale } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import type { ThemePreference } from "@/lib/theme-boot";

function SegmentedOption({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="as-press flex-1 rounded-full px-3 py-2.5 text-[13px] font-semibold disabled:opacity-60"
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
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const updateLocale = useAuthStore((s) => s.updateLocale);
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);
  const [savingLocale, setSavingLocale] = useState(false);
  const [localeError, setLocaleError] = useState<string | null>(null);

  const switchLocale = async (next: AppLocale) => {
    if (next === locale || savingLocale) return;
    setLocaleError(null);

    // Switch UI immediately. Persist in the background when signed in so a
    // slow/missing API never blocks language selection.
    if (user) {
      setUser({ ...user, locale: next });
    }
    router.replace(pathname, { locale: next });

    if (!user) return;

    setSavingLocale(true);
    const err = await updateLocale(next);
    setSavingLocale(false);
    if (err) {
      // Keep the chosen UI language; warn that it may not stick after re-login.
      setLocaleError(t("languageSaveFailed"));
    }
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
          {user ? t("languageHintSaved") : t("languageHint")}
        </p>
        <div
          className="mt-4 flex flex-wrap items-center gap-1 rounded-full border border-[var(--as-line)] p-0.5"
          role="group"
          aria-label={t("languageTitle")}
        >
          <SegmentedOption
            active={locale === "es"}
            disabled={savingLocale}
            onClick={() => void switchLocale("es")}
          >
            {t("langEs")}
          </SegmentedOption>
          <SegmentedOption
            active={locale === "en"}
            disabled={savingLocale}
            onClick={() => void switchLocale("en")}
          >
            {t("langEn")}
          </SegmentedOption>
          <SegmentedOption
            active={locale === "de"}
            disabled={savingLocale}
            onClick={() => void switchLocale("de")}
          >
            {t("langDe")}
          </SegmentedOption>
          <SegmentedOption
            active={locale === "pl"}
            disabled={savingLocale}
            onClick={() => void switchLocale("pl")}
          >
            {t("langPl")}
          </SegmentedOption>
          <SegmentedOption
            active={locale === "cs"}
            disabled={savingLocale}
            onClick={() => void switchLocale("cs")}
          >
            {t("langCs")}
          </SegmentedOption>
        </div>
        {localeError ? (
          <p className="mt-3 text-[13px] text-[var(--as-danger,#c13515)]">
            {localeError}
          </p>
        ) : null}
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
