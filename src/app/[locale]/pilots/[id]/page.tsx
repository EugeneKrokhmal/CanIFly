"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  obstacleLabel,
  pinKindLabel,
  type ObstacleType,
  type PinKind,
} from "@canifly/middleware";
import { Link } from "@/i18n/navigation";

type Pilot = {
  id: string;
  name: string;
  bio: string | null;
  operatorNumber: string | null;
  avatarUrl: string | null;
};

type ObstacleRow = {
  id: string;
  kind?: string;
  type: string;
  lat: number;
  lng: number;
  heightM: number;
  message: string | null;
  photoUrl: string | null;
  createdAt: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function PilotProfilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const t = useTranslations("pilot");
  const locale = useLocale() as "es" | "en";
  const [id, setId] = useState<string | null>(null);
  const [pilot, setPilot] = useState<Pilot | null>(null);
  const [obstacles, setObstacles] = useState<ObstacleRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const lightboxTitleId = useId();

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!lightboxSrc) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxSrc]);

  useEffect(() => {
    if (!id) return;
    if (!UUID_RE.test(id)) {
      setState("missing");
      return;
    }
    let cancelled = false;
    setState("loading");
    void (async () => {
      try {
        const res = await fetch(`/api/pilots/${id}`, { credentials: "include" });
        if (res.status === 404) {
          if (!cancelled) setState("missing");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setState("error");
          return;
        }
        const data = (await res.json()) as {
          pilot: Pilot;
          obstacles?: ObstacleRow[];
        };
        if (cancelled) return;
        setPilot(data.pilot);
        setObstacles(data.obstacles ?? []);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <div className="flex h-full items-center justify-center text-[14px] text-[var(--as-ink-soft)]">
        {t("loading")}
      </div>
    );
  }

  if (state === "missing" || state === "error" || !pilot) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-[var(--as-ink-soft)]">
        {t("unavailable")}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--as-surface-muted)] text-[var(--as-ink)]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
          {t("eyebrow")}
        </p>
        <div className="mt-3 flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] text-[22px] font-bold text-[var(--as-ink-soft)] sm:h-20 sm:w-20">
            {pilot.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pilot.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              pilot.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[32px]">
              {pilot.name}
            </h1>
            {pilot.operatorNumber ? (
              <p className="mt-1 text-[14px] text-[var(--as-ink-soft)]">
                {t("operator", { number: pilot.operatorNumber })}
              </p>
            ) : (
              <p className="mt-1 text-[14px] text-[var(--as-ink-soft)]">
                {t("communityReporter")}
              </p>
            )}
          </div>
        </div>

        {pilot.bio ? (
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--as-ink)]">
            {pilot.bio}
          </p>
        ) : null}

        <section className="mt-8">
          <h2 className="text-[12px] font-semibold text-[var(--as-ink)]">
            {t("reportedHeading", { count: obstacles.length })}
          </h2>

          {obstacles.length === 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
              {t("noneYet")}
            </p>
          ) : (
            <ul className="as-stagger mt-3 space-y-3">
              {obstacles.map((o) => {
                const kind = (o.kind === "fly_spot" ? "fly_spot" : "obstacle") as PinKind;
                const label = obstacleLabel(
                  o.type as ObstacleType,
                  locale,
                );
                const mapHref = {
                  pathname: "/" as const,
                  query: {
                    lat: o.lat.toFixed(5),
                    lng: o.lng.toFixed(5),
                  },
                };
                return (
                  <li
                    key={o.id}
                    className="overflow-hidden rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] shadow-[var(--as-shadow)]"
                  >
                    {o.photoUrl ? (
                      <button
                        type="button"
                        onClick={() => setLightboxSrc(o.photoUrl)}
                        className="group relative block w-full cursor-zoom-in overflow-hidden"
                        aria-label={t("openPhoto")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={o.photoUrl}
                          alt=""
                          className="h-36 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                        />
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-3 pb-2.5 pt-8 text-left text-[12px] font-semibold text-white opacity-90 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                          {t("openPhoto")}
                        </span>
                      </button>
                    ) : null}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--as-ink-soft)]">
                            {pinKindLabel(kind, locale)}
                          </p>
                          <p className="text-[15px] font-semibold text-[var(--as-ink)]">
                            {label}
                          </p>
                          <p className="mt-1 text-[13px] text-[var(--as-ink-soft)]">
                            ~{Math.round(o.heightM)} m AGL ·{" "}
                            {o.lat.toFixed(4)}, {o.lng.toFixed(4)}
                          </p>
                        </div>
                        <Link
                          href={mapHref}
                          className="as-press shrink-0 rounded-full border border-[var(--as-line)] px-3 py-1.5 text-[12px] font-semibold text-[var(--as-ink)] hover:bg-[var(--as-surface-muted)]"
                        >
                          {t("viewOnMap")}
                        </Link>
                      </div>
                      {o.message ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-[var(--as-ink)]">
                          {o.message}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-[var(--as-muted)]">
                        {new Date(o.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-10 text-[13px] text-[var(--as-ink-soft)]">
          <Link
            href="/"
            className="font-semibold text-[#ff385c] hover:underline"
          >
            {t("backToMap")}
          </Link>
        </p>
      </div>

      {lightboxSrc ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={lightboxTitleId}
          onClick={() => setLightboxSrc(null)}
        >
          <p id={lightboxTitleId} className="sr-only">
            {t("photoFullscreen")}
          </p>
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="as-press absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-[22px] leading-none text-white hover:bg-white/25 sm:right-5 sm:top-5"
            aria-label={t("closePhoto")}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            className="as-fade max-h-[min(92dvh,100%)] max-w-full rounded-lg object-contain shadow-[0_12px_48px_rgba(0,0,0,0.45)]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
