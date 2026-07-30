"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth";

export default function ResetPasswordClient() {
  const t = useTranslations("resetPassword");
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const token = searchParams.get("token")?.trim() ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"form" | "submitting" | "ok">("form");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        user?: Parameters<typeof setUser>[0];
      };
      if (!res.ok || !data.user) {
        setStatus("form");
        setError(data.error ?? t("failed"));
        return;
      }
      setUser(data.user);
      setStatus("ok");
    } catch {
      setStatus("form");
      setError(t("failed"));
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-8">
        <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight">
          {t("title")}
        </h1>

        {!token ? (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("missingToken")}
            </p>
            <Link
              href="/"
              className="as-press mt-8 inline-flex rounded-full bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)]"
            >
              {t("backToMap")}
            </Link>
          </>
        ) : status === "ok" ? (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("success")}
            </p>
            <Link
              href="/account"
              className="as-press mt-8 inline-flex rounded-full bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)]"
            >
              {t("goAccount")}
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("blurb")}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-[var(--as-ink)]">
                  {t("password")}{" "}
                  <span className="font-bold text-[var(--as-rausch)]">*</span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--as-line)] px-3 py-2.5 text-[14px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--as-ink)] focus:shadow-[0_0_0_3px_rgba(34,34,34,0.08)]"
                />
                <span className="mt-1 block text-[11px] text-[var(--as-ink-soft)]">
                  {t("passwordHint")}
                </span>
              </label>

              {error ? (
                <p className="as-rise-soft rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="as-press w-full rounded-xl bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)] disabled:opacity-60"
              >
                {status === "submitting" ? t("pleaseWait") : t("submit")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
