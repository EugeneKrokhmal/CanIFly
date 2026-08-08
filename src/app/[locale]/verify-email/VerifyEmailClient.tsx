"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth";
import { markTourPending } from "@/lib/onboarding-tour";

export default function VerifyEmailClient() {
  const t = useTranslations("verifyEmail");
  const searchParams = useSearchParams();
  const setUser = useAuthStore((s) => s.setUser);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token")?.trim();
    if (!token) {
      setStatus("error");
      setMessage(t("missingToken"));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          user?: Parameters<typeof setUser>[0];
        };
        if (cancelled) return;
        if (!res.ok || !data.user) {
          setStatus("error");
          setMessage(data.error ?? t("failed"));
          return;
        }
        setUser(data.user);
        markTourPending();
        setStatus("ok");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage(t("failed"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setUser, t]);

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <div className="mx-auto max-w-md px-4 py-12 sm:px-8">
        <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
          {t("eyebrow")}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
          {status === "loading"
            ? t("checking")
            : status === "ok"
              ? t("success")
              : (message ?? t("failed"))}
        </p>
        {status !== "loading" ? (
          <Link
            href={status === "ok" ? "/?tour=1" : "/"}
            className="as-press mt-8 inline-flex rounded-full bg-[var(--as-ink)] px-4 py-2.5 text-[14px] font-semibold text-[var(--as-ink-invert)]"
          >
            {status === "ok" ? t("goMapTour") : t("backToMap")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
