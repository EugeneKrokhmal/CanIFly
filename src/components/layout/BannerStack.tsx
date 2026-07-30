"use client";

import { usePathname } from "@/i18n/navigation";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { useUsageBannerVisible } from "@/hooks/useUsageBanner";
import { CookieBannerCard } from "@/components/layout/banners/CookieBannerCard";
import { UsageLimitBannerCard } from "@/components/layout/banners/UsageLimitBannerCard";

type BannerStackProps = {
  /** Map page: stack sits above the mobile flight sheet peek. */
  variant?: "map" | "page";
};

const MAP_STACK_CLASS =
  "absolute inset-x-0 bottom-[calc(108px+0.5rem+env(safe-area-inset-bottom))] z-[25] md:bottom-5";

const PAGE_STACK_CLASS = "fixed inset-x-0 bottom-0 z-[70]";

export function BannerStack({ variant = "page" }: BannerStackProps) {
  const pathname = usePathname();
  const isMapHome = pathname === "/";
  const { visible: cookieVisible, choose } = useCookieConsent();
  const [usageVisible, dismissUsage] = useUsageBannerVisible();

  if (variant === "page" && isMapHome) return null;

  const showUsage = variant === "map" && isMapHome;

  if (!cookieVisible && !(showUsage && usageVisible)) return null;

  return (
    <div
      className={`pointer-events-none flex flex-col items-center gap-2 px-3 sm:px-4 ${
        variant === "map" ? MAP_STACK_CLASS : PAGE_STACK_CLASS
      }`}
      style={{
        paddingBottom:
          variant === "map"
            ? undefined
            : "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      {showUsage && usageVisible ? (
        <UsageLimitBannerCard onDismiss={dismissUsage} />
      ) : null}
      {cookieVisible ? <CookieBannerCard onChoose={choose} /> : null}
    </div>
  );
}
