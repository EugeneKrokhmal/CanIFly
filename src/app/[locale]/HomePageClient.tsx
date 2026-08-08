"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { COUNTRIES, type CountryId } from "@canifly/middleware";
import { SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { BannerStack } from "@/components/layout/BannerStack";
import { MobileFlightSheet } from "@/components/layout/MobileFlightSheet";
import { TopPilotsStack } from "@/components/map/TopPilotsStack";
import { useAirspaceStatus } from "@/hooks/useAirspaceStatus";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { useAuthStore } from "@/stores/auth";
import { markTourPending } from "@/lib/onboarding-tour";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";

function MapLoading() {
  const t = useTranslations("map");
  return (
    <div className="flex h-full items-center justify-center bg-[var(--as-map-bg)] text-sm text-[var(--as-ink-soft)]">
      {t("loading")}
    </div>
  );
}

const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => <MapLoading />,
  },
);

function AirspaceStatusBinder() {
  useAirspaceStatus();
  return null;
}

function MapDeepLink() {
  const searchParams = useSearchParams();
  const locateAndFocus = useDroneProfileStore((s) => s.locateAndFocus);
  const requestGeolocate = useDroneProfileStore((s) => s.requestGeolocate);

  useEffect(() => {
    const latRaw = searchParams.get("lat");
    const lngRaw = searchParams.get("lng");

    if (latRaw != null && lngRaw != null) {
      const lat = Number(latRaw);
      const lng = Number(lngRaw);
      if (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        // Pin deep-link: do not call geolocate (it would steal the camera).
        locateAndFocus({ lat, lng }, 15);
        return;
      }
    }

    // No coordinates in the URL — geolocate user and show flight status at their position.
    requestGeolocate({ skipGuestGate: true });
  }, [searchParams, locateAndFocus, requestGeolocate]);

  return null;
}

function AuthReturnHandler() {
  const searchParams = useSearchParams();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const setAuthNotice = useAuthStore((s) => s.setAuthNotice);

  useEffect(() => {
    const auth = searchParams.get("auth");
    const authError = searchParams.get("auth_error");
    if (auth === "google") {
      if (searchParams.get("new") === "1") {
        markTourPending();
      }
      void fetchMe();
      setAuthModalOpen(false);
    } else if (authError === "google") {
      setAuthNotice("google");
      setAuthModalOpen(true, "login");
    }
  }, [searchParams, fetchMe, setAuthModalOpen, setAuthNotice]);

  return null;
}

type HomePageClientProps = {
  /** Soft map frame from CDN IP geo when the visitor is in a live country. */
  ipCountry?: CountryId | null;
};

export default function HomePageClient({
  ipCountry = null,
}: HomePageClientProps) {
  const setApproxCenter = useDroneProfileStore((s) => s.setApproxCenter);
  const initialCenter = ipCountry ? COUNTRIES[ipCountry].center : undefined;

  // Home may override layout IP with ?country= (or clear on deep-link).
  useEffect(() => {
    if (!ipCountry) return;
    const [lng, lat] = COUNTRIES[ipCountry].center;
    setApproxCenter({ lat, lng });
  }, [ipCountry, setApproxCenter]);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <AirspaceStatusBinder />
      <MapDeepLink />
      <AuthReturnHandler />
      <OnboardingTour />

      <div className="hidden h-full w-[var(--as-sidebar-w)] shrink-0 flex-col overflow-hidden border-r border-[var(--as-line)] bg-[var(--as-surface)] shadow-[2px_0_12px_rgba(0,0,0,0.04)] md:flex">
        <SidebarPanel showDesktopAddPin />
      </div>

      <div className="relative h-full min-w-0 flex-1 overflow-hidden bg-[var(--as-map-bg)]">
        {/* Absolute fill so overlays (sheet/popups) cannot collapse map height. */}
        <div className="absolute inset-0">
          <MapView className="h-full w-full" initialCenter={initialCenter} />
        </div>
        <TopPilotsStack />
        <BannerStack variant="map" />
        <MobileFlightSheet />
      </div>
    </div>
  );
}
