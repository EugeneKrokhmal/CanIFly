"use client";

import { useTranslations } from "next-intl";
import {
  FREE_CHECK_LIMIT,
  snoozeAuthPrompt,
} from "@/lib/auth/usage-gate";
import { useAuthStore } from "@/stores/auth";
import {
  BannerActions,
  BannerCaptionButton,
  BannerCard,
  BannerContent,
  BannerPrimaryButton,
  BannerRow,
} from "@/components/layout/banners/BannerPrimitives";

type UsageLimitBannerCardProps = {
  onDismiss: () => void;
};

export function UsageLimitBannerCard({ onDismiss }: UsageLimitBannerCardProps) {
  const t = useTranslations("usageBanner");
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);

  return (
    <BannerCard role="status">
      <BannerRow>
        <BannerContent>
          {t("message", { count: FREE_CHECK_LIMIT })}
        </BannerContent>
        <BannerActions>
          <BannerPrimaryButton
            onClick={() => setAuthModalOpen(true, "register")}
          >
            {t("createAccount")}
          </BannerPrimaryButton>
          <BannerCaptionButton
            onClick={() => {
              snoozeAuthPrompt();
              onDismiss();
            }}
          >
            {t("remindLater")}
          </BannerCaptionButton>
        </BannerActions>
      </BannerRow>
    </BannerCard>
  );
}
