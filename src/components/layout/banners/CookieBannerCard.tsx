"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CookieConsent } from "@/hooks/useCookieConsent";
import {
  BannerActions,
  BannerCaptionButton,
  BannerCard,
  BannerContent,
  BannerPrimaryButton,
  BannerRow,
} from "@/components/layout/banners/BannerPrimitives";

type CookieBannerCardProps = {
  onChoose: (value: CookieConsent) => void;
};

export function CookieBannerCard({ onChoose }: CookieBannerCardProps) {
  const t = useTranslations("cookie");

  return (
    <BannerCard role="dialog" ariaLabel={t("aria")}>
      <BannerRow>
        <BannerContent title={t("title")}>
          {t("body")}{" "}
          <Link
            href="/privacy"
            className="font-semibold text-[var(--as-ink)] underline underline-offset-2"
          >
            {t("privacyLink")}
          </Link>
          .
        </BannerContent>
        <BannerActions>
          <BannerPrimaryButton onClick={() => onChoose("accepted")}>
            {t("accept")}
          </BannerPrimaryButton>
          <BannerCaptionButton onClick={() => onChoose("rejected")}>
            {t("reject")}
          </BannerCaptionButton>
        </BannerActions>
      </BannerRow>
    </BannerCard>
  );
}
