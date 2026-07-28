"use client";

import { useEffect } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { AuthModal } from "@/components/layout/AuthModal";
import { useAuthStore } from "@/stores/auth";

function AuthBootstrap() {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);
  return null;
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#f7f7f7]">
      <AuthBootstrap />
      <SiteHeader />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</div>
      <CookieBanner />
      <AuthModal />
    </div>
  );
}

export default AppShell;
