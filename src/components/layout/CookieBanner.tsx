"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const STORAGE_KEY = "canifly-cookie-consent";

export type CookieConsent = "accepted" | "rejected";

function readConsent(): CookieConsent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "accepted" || v === "rejected") return v;
  } catch {
    /* private mode */
  }
  return null;
}

function writeConsent(value: CookieConsent) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

export function CookieBanner() {
  const t = useTranslations("cookie");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readConsent() === null);
  }, []);

  const choose = (value: CookieConsent) => {
    writeConsent(value);
    setVisible(false);
    window.dispatchEvent(
      new CustomEvent("canifly-cookie-consent", { detail: value }),
    );
  };

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-3 sm:p-4"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      role="dialog"
      aria-label={t("aria")}
      aria-live="polite"
    >
      <div className="as-rise pointer-events-auto w-full max-w-3xl rounded-2xl border border-[#dddddd] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.16)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-[#222222]">
              {t("title")}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#717171]">
              {t("body")}{" "}
              <Link
                href="/privacy"
                className="font-semibold text-[#222222] underline underline-offset-2"
              >
                {t("privacyLink")}
              </Link>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => choose("rejected")}
              className="as-press rounded-lg border border-[#dddddd] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#222222] hover:bg-[#f7f7f7]"
            >
              {t("reject")}
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="as-press rounded-lg bg-[#222222] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-[#000000]"
            >
              {t("accept")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
