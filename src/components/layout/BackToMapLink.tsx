"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  /** Message namespace that defines `backToMap`. */
  namespace?:
    | "contacts"
    | "guide"
    | "faq"
    | "privacy"
    | "terms"
    | "settings"
    | "account"
    | "verifyEmail"
    | "resetPassword"
    | "pilot"
    | "landing";
};

/**
 * Escape hatch to the map — always place at the true end of page content,
 * never between sections.
 */
export function BackToMapLink({ namespace = "contacts" }: Props) {
  const t = useTranslations(namespace);

  return (
    <p className="mt-8">
      <Link
        href="/"
        className="text-[14px] font-medium text-[var(--as-ink-soft)] hover:underline"
      >
        {t("backToMap")}
      </Link>
    </p>
  );
}
