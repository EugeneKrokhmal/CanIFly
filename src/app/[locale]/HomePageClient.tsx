"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { MobileFlightSheet } from "@/components/layout/MobileFlightSheet";
import { useAirspaceStatus } from "@/hooks/useAirspaceStatus";
import { useDroneProfileStore } from "@/stores/drone-profile";

function MapLoading() {
  const t = useTranslations("map");
  return (
    <div className="flex h-full items-center justify-center bg-[#ebebeb] text-sm text-[#717171]">
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
        locateAndFocus({ lat, lng }, 15);
        return;
      }
    }

    // Show the MapLibre user-location dot + center the map.
    requestGeolocate();
  }, [searchParams, locateAndFocus, requestGeolocate]);

  return null;
}

export default function HomePageClient() {
  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <AirspaceStatusBinder />
      <MapDeepLink />

      <div className="hidden h-full w-80 shrink-0 flex-col overflow-hidden border-r border-[#dddddd] bg-white shadow-[2px_0_12px_rgba(0,0,0,0.04)] md:flex">
        <SidebarPanel />
      </div>

      <div className="relative h-full min-w-0 flex-1 bg-[#ebebeb]">
        <div className="h-full w-full md:pb-0">
          <MapView className="h-full w-full" />
        </div>
        <MobileFlightSheet />
      </div>
    </div>
  );
}
