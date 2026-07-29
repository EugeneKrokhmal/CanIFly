"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { AuthModal } from "@/components/layout/AuthModal";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore, type AppLocale } from "@/stores/auth";
import { ThemeSync } from "@/stores/theme";

function AuthBootstrap() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);
  return null;
}

/** Restore preferred language from the account after login / session restore. */
function LocaleSync() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user?.locale) return;
    if (user.locale === locale) return;
    router.replace(pathname, { locale: user.locale });
  }, [loading, user?.locale, locale, pathname, router]);

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
      <CookieBanner />
      <AuthModal />
    </div>
  );
}

export default AppShell;
