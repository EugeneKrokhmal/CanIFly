"use client";

import { useLayoutEffect } from "react";
import { COUNTRIES, type CountryId } from "@canifly/middleware";
import { useDroneProfileStore } from "@/stores/drone-profile";

/**
 * Soft-seed map/weather coords from CDN IP / country before GPS or a pin.
 * Mount above WeatherWidget so the first forecast request is already local.
 */
export function IpApproxBinder({
  country,
}: {
  country: CountryId | null;
}) {
  const setApproxCenter = useDroneProfileStore((s) => s.setApproxCenter);

  useLayoutEffect(() => {
    if (!country) {
      setApproxCenter(null);
      return;
    }
    const [lng, lat] = COUNTRIES[country].center;
    setApproxCenter({ lat, lng });
  }, [country, setApproxCenter]);

  return null;
}
