"use client";

import type { PointerEventHandler } from "react";
import { useTranslations } from "next-intl";
import { type AirspaceStatus, type MatchedZone } from "@canifly/middleware";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { DronePicker } from "@/components/sidebar/DronePicker";

function statusColor(status: AirspaceStatus): string {
  if (status === "clear" || status === "limited") return "var(--as-clear)";
  if (status === "restricted") return "var(--as-restricted)";
  return "var(--as-prohibited)";
}

const WEIGHT_OPTIONS = [
  { id: "c0" as const, label: "C0", hint: "<250g" },
  { id: "c1" as const, label: "C1", hint: "250–900g" },
  { id: "c2" as const, label: "C2", hint: "≤4kg" },
];

export type SheetDragProps = {
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  onPointerCancel: PointerEventHandler<HTMLElement>;
};

/** Present on API zones once @canifly/middleware enrichment ships on GitHub main. */
type EnrichedMatchedZone = MatchedZone & {
  enrichment?: {
    contacts?: Array<{
      email?: string | null;
      phone?: string | null;
      url?: string | null;
    }>;
  };
};

function formatZoneContacts(z: MatchedZone): string[] {
  const zone = z as EnrichedMatchedZone;
  if (zone.enrichment?.contacts?.length) {
    return zone.enrichment.contacts.flatMap((c) => {
      const parts = [c.email, c.phone, c.url].filter(Boolean);
      return parts.length ? [parts.join(" · ")] : [];
    });
  }
  return z.contact ? [z.contact] : [];
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function sectionLabel(text: string) {
  return (
    <h2 className="text-[12px] font-semibold text-[var(--as-ink)]">{text}</h2>
  );
}

export function SidebarPanel({
  sheetDragProps,
}: {
  /** Mobile sheet: drag this header to collapse/expand. */
  sheetDragProps?: SheetDragProps;
} = {}) {
  const t = useTranslations("sidebar");
  const tStatus = useTranslations("status");
  const status = useDroneProfileStore((s) => s.status);
  const summary = useDroneProfileStore((s) => s.summary);
  const zones = useDroneProfileStore((s) => s.zones);
  const loading = useDroneProfileStore((s) => s.statusLoading);
  const error = useDroneProfileStore((s) => s.statusError);
  const selectedPoint = useDroneProfileStore((s) => s.selectedPoint);
  const queryMs = useDroneProfileStore((s) => s.queryMs);
  const backend = useDroneProfileStore((s) => s.backend);
  const dataVersion = useDroneProfileStore((s) => s.dataVersion);
  const mapBackend = useDroneProfileStore((s) => s.mapBackend);
  const mapDataVersion = useDroneProfileStore((s) => s.mapDataVersion);
  const mapQueryMs = useDroneProfileStore((s) => s.mapQueryMs);
  const requestGeolocate = useDroneProfileStore((s) => s.requestGeolocate);
  const weightClass = useDroneProfileStore((s) => s.weightClass);
  const setWeightClass = useDroneProfileStore((s) => s.setWeightClass);
  const maxAltitudeAgl = useDroneProfileStore((s) => s.maxAltitudeAgl);
  const setMaxAltitudeAgl = useDroneProfileStore((s) => s.setMaxAltitudeAgl);
  const highlightedZoneId = useDroneProfileStore((s) => s.highlightedZoneId);
  const setHighlightedZoneId = useDroneProfileStore(
    (s) => s.setHighlightedZoneId,
  );

  const freeBandHint = (zone: MatchedZone): string | null => {
    const msg = (zone.message ?? "").toLowerCase();
    if (
      msg.includes("están permitidas las operaciones vlos") &&
      zone.lowerLimitM > 0
    ) {
      return t("vlosHint", { meters: Math.round(zone.lowerLimitM) });
    }
    if (msg.includes("no es necesario coordinar") && zone.lowerLimitM > 0) {
      return t("noCoordHint", { meters: Math.round(zone.lowerLimitM) });
    }
    if (msg.includes("no permitido el vuelo")) {
      return t("noFlightHint");
    }
    return null;
  };

  const restrictionLabel = (restriction: string): string => {
    const r = restriction.toUpperCase();
    if (r.includes("PROHIB")) return t("restrictionProhibited");
    if (r.includes("AUTHORI")) return t("restrictionAuth");
    if (r === "CONDITIONAL") return t("restrictionConditional");
    if (r === "NO_RESTRICTION") return t("restrictionNone");
    return restriction;
  };

  const sourceLabel = (source: string): string => {
    if (source === "aero") return t("sourceAero");
    if (source === "urbano") return t("sourceUrbano");
    if (source === "infra") return t("sourceInfra");
    if (source === "servais") return t("sourceServais");
    if (source === "pansa") return t("sourcePansa");
    if (source === "anscr") return t("sourceAnscr");
    return source;
  };

  const backendLabel = (value: string): string => {
    if (value === "servais") return "ENAIRE servAIS";
    if (value === "pansa") return "PANSA DroneMap";
    if (value === "aimgis") return "ANS CR aimgis";
    if (value === "postgis") return "PostGIS";
    if (value === "multi") return "multi";
    return value;
  };

  const locate = () => {
    requestGeolocate();
  };

  // Prefer next-intl messages (all UI locales). Middleware labels can lag a pin.
  const statusText = status ? tStatus(status) : null;

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-[var(--as-surface)] text-[var(--as-ink)]">
      <div
        className={
          sheetDragProps
            ? "cursor-grab border-b border-[var(--as-line-soft)] px-5 pb-4 pt-5 active:cursor-grabbing touch-none"
            : "border-b border-[var(--as-line-soft)] px-5 pb-4 pt-5"
        }
        {...(sheetDragProps ?? {})}
      >
        <p className="text-[12px] font-semibold text-[var(--as-ink)]">
          {t("flightProfile")}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("flightProfileHint")}
        </p>
      </div>

      <div className="as-scroll flex-1 overflow-y-auto px-5 py-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            {sectionLabel(t("aircraft"))}
            <button
              type="button"
              onClick={locate}
              className="text-[13px] font-semibold text-[#ff385c] hover:underline"
            >
              {t("locateMe")}
            </button>
          </div>

          <DronePicker />

          <div className="mt-3 grid grid-cols-3 gap-2">
            {WEIGHT_OPTIONS.map((opt) => {
              const active = weightClass === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setWeightClass(opt.id)}
                  className="as-press rounded-xl border px-2 py-2.5 text-center"
                  style={{
                    borderColor: active ? "var(--as-ink)" : "var(--as-line)",
                    background: active ? "var(--as-hover)" : "var(--as-surface)",
                    boxShadow: active ? "inset 0 0 0 1px var(--as-ink)" : undefined,
                  }}
                >
                  <div className="text-[15px] font-bold">{opt.label}</div>
                  <div className="text-[11px] text-[var(--as-ink-soft)]">{opt.hint}</div>
                </button>
              );
            })}
          </div>

          <label className="mt-5 block">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-[var(--as-ink)]">
                {t("ceilingAgl")}
              </span>
              <span className="text-[18px] font-bold text-[var(--as-ink)]">
                {maxAltitudeAgl}
                <span className="ml-1 text-[12px] font-medium text-[var(--as-ink-soft)]">
                  m
                </span>
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={maxAltitudeAgl}
              onChange={(e) => setMaxAltitudeAgl(Number(e.target.value))}
              className="w-full accent-[#ff385c]"
            />
          </label>
        </section>

        <section className="mt-8">
          {sectionLabel(t("flightCheck"))}

          {!selectedPoint && !loading && (
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("tapTakeoff")}
            </p>
          )}

          {loading && (
            <div className="mt-4 space-y-2">
              <div className="as-skeleton h-8 w-36 rounded-lg" />
              <div className="as-skeleton h-3 w-full rounded" />
              <div className="as-skeleton h-3 w-2/3 rounded" />
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-sm text-[var(--as-prohibited)]">
              {error}
            </p>
          )}

          {!loading && status && statusText && (
            <div
              key={`${status}-${selectedPoint?.lat}`}
              className="as-status-flash mt-4 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface-muted)] p-4"
            >
              <div
                className="inline-flex rounded-full py-1 text-[13px] font-bold"
                style={{
                  color: statusColor(status),
                  background: `${statusColor(status)}18`,
                }}
              >
                {statusText}
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--as-ink)]">
                {summary}
              </p>
              {selectedPoint && (
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] text-[var(--as-ink-soft)]">
                  <div>
                    <dt className="font-medium text-[var(--as-muted)]">{t("lat")}</dt>
                    <dd className="mt-0.5 text-[var(--as-ink)]">
                      {selectedPoint.lat.toFixed(5)}°
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--as-muted)]">{t("lng")}</dt>
                    <dd className="mt-0.5 text-[var(--as-ink)]">
                      {selectedPoint.lng.toFixed(5)}°
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--as-muted)]">
                      {t("ceiling")}
                    </dt>
                    <dd className="mt-0.5 text-[var(--as-ink)]">
                      {maxAltitudeAgl} m AGL
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--as-muted)]">{t("class")}</dt>
                    <dd className="mt-0.5 text-[var(--as-ink)]">
                      {weightClass.toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--as-muted)]">{t("zones")}</dt>
                    <dd className="mt-0.5 text-[var(--as-ink)]">{zones.length}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[var(--as-muted)]">{t("source")}</dt>
                    <dd className="mt-0.5 text-[var(--as-ink)]">
                      {backend ?? "—"}
                      {queryMs != null ? ` · ${queryMs}ms` : ""}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          )}
        </section>

        {zones.length > 0 && (
          <section className="mt-8">
            {sectionLabel(t("zonesHeading", { count: zones.length }))}
            <ol className="as-stagger mt-3 space-y-2">
              {zones.map((z, idx) => {
                const n = String(idx + 1).padStart(2, "0");
                const active = highlightedZoneId === z.identifier;
                const hint = freeBandHint(z);
                const plain = z.message ? stripHtml(z.message) : "";
                return (
                  <li key={`${z.identifier}-${z.lowerLimitM}-${idx}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setHighlightedZoneId(z.identifier)}
                      onMouseLeave={() => setHighlightedZoneId(null)}
                      onFocus={() => setHighlightedZoneId(z.identifier)}
                      onBlur={() => setHighlightedZoneId(null)}
                      onClick={() =>
                        setHighlightedZoneId(active ? null : z.identifier)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setHighlightedZoneId(active ? null : z.identifier);
                        }
                      }}
                      className="as-press w-full cursor-pointer rounded-2xl border px-3 py-3 text-left"
                      style={{
                        borderColor: active ? "var(--as-ink)" : "var(--as-line-soft)",
                        background: active ? "var(--as-hover)" : "var(--as-surface)",
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[13px] font-bold text-[#ff385c]">
                          {n}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold leading-snug text-[var(--as-ink)]">
                            {(z.name || z.identifier)
                              .replace(/<[^>]+>/g, " ")
                              .replace(/\s+/g, " ")
                              .trim()}
                          </span>
                          <span className="mt-1 block text-[12px] text-[var(--as-ink-soft)]">
                            {restrictionLabel(String(z.restriction))} ·{" "}
                            {Math.round(z.lowerLimitM)}–
                            {Math.round(z.upperLimitM)}m {z.lowerRef} ·{" "}
                            {sourceLabel(z.source)}
                          </span>
                          {z.reason.length > 0 && (
                            <span className="mt-1 block text-[12px] text-[var(--as-ink-soft)]">
                              {t("reason", { reasons: z.reason.join(", ") })}
                            </span>
                          )}
                          {hint && (
                            <span className="mt-1.5 block text-[13px] leading-snug text-[#ff385c]">
                              {hint}
                            </span>
                          )}
                          {status === "limited" &&
                            idx === 0 &&
                            !hint &&
                            z.lowerLimitM > 0 && (
                              <span className="mt-1.5 block text-[13px] leading-snug text-[#ff385c]">
                                {t("freeBand", {
                                  meters: Math.round(z.lowerLimitM),
                                })}
                              </span>
                            )}
                          {plain && (
                            <span className="mt-2 block whitespace-pre-line text-[13px] leading-relaxed text-[var(--as-ink-soft)]">
                              {plain}
                            </span>
                          )}
                          {formatZoneContacts(z).map((line) => (
                            <span
                              key={line}
                              className="mt-2 block break-all text-[12px] text-[var(--as-ink)]"
                            >
                              {t("contact", { contact: line })}
                            </span>
                          ))}
                          <span className="mt-1 block text-[11px] text-[var(--as-muted)]">
                            ID {z.identifier}
                          </span>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </div>

      {(mapBackend || backend || dataVersion) && (
        <div className="border-t border-[var(--as-line-soft)] px-5 py-3 text-[11px] text-[var(--as-muted)]">
          {mapBackend && (
            <p>
              {t("mapZones", { backend: backendLabel(mapBackend) })}
              {mapBackend === "servais" ? ` · ${t("mapLive")}` : ""}
              {mapDataVersion ? ` · ${mapDataVersion}` : ""}
              {mapQueryMs != null ? ` · ${mapQueryMs}ms` : ""}
            </p>
          )}
          {(backend || dataVersion) && (
            <p className={mapBackend ? "mt-1" : undefined}>
              {backend ? backendLabel(backend) : t("offline")}
              {dataVersion ? ` · ${dataVersion}` : ""}
              {queryMs != null ? ` · ${queryMs}ms` : ""}
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
