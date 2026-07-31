"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BannerStack } from "@/components/layout/BannerStack";
import { AuthModal } from "@/components/layout/AuthModal";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore, type AppLocale } from "@/stores/auth";
import { ThemeSync } from "@/stores/theme";

function AuthBootstrap() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchGoogleOAuthEnabled = useAuthStore((s) => s.fetchGoogleOAuthEnabled);
  useEffect(() => {
    void fetchMe();
    void fetchGoogleOAuthEnabled();
  }, [fetchMe, fetchGoogleOAuthEnabled]);
  return null;
}

/** Restore preferred language from the account after login / session restore. */
function LocaleSync() {
  const serverLocale = useAuthStore((s) => s.serverLocale);
  const loading = useAuthStore((s) => s.loading);
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only when the API explicitly returned/saved a locale — never force a
    // client default of "es" (old API builds omit the field).
    if (loading || !serverLocale) return;
    if (serverLocale === locale) return;
    router.replace(pathname, { locale: serverLocale });
  }, [loading, serverLocale, locale, pathname, router]);

  return null;
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[var(--as-surface-muted)]">
      <ThemeSync />
      <AuthBootstrap />
      <LocaleSync />
      <SiteHeader />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      <BannerStack variant="page" />
      <AuthModal />
    </div>
  );
}

export default AppShell;
