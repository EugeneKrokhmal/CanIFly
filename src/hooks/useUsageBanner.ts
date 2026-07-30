"use client";

import { useEffect, useState } from "react";
import {
  shouldShowUsageBanner,
  USAGE_GATE_EVENT,
} from "@/lib/auth/usage-gate";
import { useAuthStore } from "@/stores/auth";

export function useUsageBannerVisible() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(shouldShowUsageBanner(Boolean(user)));
    sync();
    window.addEventListener(USAGE_GATE_EVENT, sync);
    return () => window.removeEventListener(USAGE_GATE_EVENT, sync);
  }, [user]);

  return [visible, () => setVisible(false)] as const;
}
