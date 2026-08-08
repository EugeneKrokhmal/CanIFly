export type GeocodeHit = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  countryCode: string | null;
  country: string | null;
  admin1: string | null;
  label: string;
};

type OpenMeteoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
};

type OpenMeteoResponse = {
  results?: OpenMeteoResult[];
};

function formatLabel(r: OpenMeteoResult): string {
  const parts = [r.name, r.admin1, r.country].filter(Boolean);
  // Drop duplicate adjacent parts (e.g. name === admin1)
  const unique: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (unique[unique.length - 1]?.toLowerCase() === p.toLowerCase()) continue;
    unique.push(p);
  }
  return unique.join(", ");
}

/**
 * Free Open-Meteo geocoding (no API key).
 * European coverage hits are sorted first for CanIFly.
 */
export async function searchLocations(
  query: string,
  opts: { language: string; signal?: AbortSignal; count?: number } = {
    language: "es",
  },
): Promise<GeocodeHit[]> {
  const name = query.trim();
  if (name.length < 2) return [];

  const params = new URLSearchParams({
    name,
    count: String(opts.count ?? 8),
    language: opts.language.slice(0, 2).toLowerCase(),
    format: "json",
  });

  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
    {
      signal: opts.signal,
      headers: { Accept: "application/json" },
    },
  );
  if (!res.ok) throw new Error(`geocode_${res.status}`);

  const data = (await res.json()) as OpenMeteoResponse;
  const hits = (data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    countryCode: r.country_code?.toUpperCase() ?? null,
    country: r.country ?? null,
    admin1: r.admin1 ?? null,
    label: formatLabel(r),
  }));

  const rank = (code: string | null) =>
    code === "ES" ||
    code === "DE" ||
    code === "FR" ||
    code === "DK" ||
    code === "CH" ||
    code === "PT" ||
    code === "AT" ||
    code === "SE" ||
    code === "IE" ||
    code === "LV" ||
    code === "LT" ||
    code === "EE" ||
    code === "SK" ||
    code === "SI" ||
    code === "CZ" ||
    code === "PL"
      ? 0
      : 1;

  return hits.sort((a, b) => rank(a.countryCode) - rank(b.countryCode));
}
