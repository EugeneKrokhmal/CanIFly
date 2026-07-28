"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { obstacleLabel, type ObstacleType } from "@canifly/middleware";
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

  useEffect(() => {
    void params.then((p) => setId(p.id));
  }, [params]);

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
      <div className="flex h-full items-center justify-center text-[14px] text-[#717171]">
        {t("loading")}
      </div>
    );
  }

  if (state === "missing" || state === "error" || !pilot) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-[#717171]">
        {t("unavailable")}
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f7f7f7] text-[#222222]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="text-[12px] font-semibold text-[#717171]">
          {t("eyebrow")}
        </p>
        <div className="mt-3 flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-[#dddddd] bg-white text-[22px] font-bold text-[#717171] sm:h-20 sm:w-20">
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
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[#222222] sm:text-[32px]">
              {pilot.name}
            </h1>
            {pilot.operatorNumber ? (
              <p className="mt-1 text-[14px] text-[#717171]">
                {t("operator", { number: pilot.operatorNumber })}
              </p>
            ) : (
              <p className="mt-1 text-[14px] text-[#717171]">
                {t("communityReporter")}
              </p>
            )}
          </div>
        </div>

        {pilot.bio ? (
          <p className="mt-5 text-[15px] leading-relaxed text-[#222222]">
            {pilot.bio}
          </p>
        ) : null}

        <section className="mt-8">
          <h2 className="text-[12px] font-semibold text-[#222222]">
            {t("reportedHeading", { count: obstacles.length })}
          </h2>

          {obstacles.length === 0 ? (
            <p className="mt-3 text-[14px] leading-relaxed text-[#717171]">
              {t("noneYet")}
            </p>
          ) : (
            <ul className="as-stagger mt-3 space-y-3">
              {obstacles.map((o) => {
                const label = obstacleLabel(
                  o.type as ObstacleType,
                  locale,
                );
                const mapHref = `/?lat=${o.lat.toFixed(5)}&lng=${o.lng.toFixed(5)}`;
                return (
                  <li
                    key={o.id}
                    className="overflow-hidden rounded-2xl border border-[#ebebeb] bg-white shadow-[var(--as-shadow)]"
                  >
                    {o.photoUrl?.startsWith("/uploads/obstacles/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.photoUrl}
                        alt=""
                        className="h-36 w-full object-cover"
                      />
                    ) : null}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-semibold text-[#222222]">
                            {label}
                          </p>
                          <p className="mt-1 text-[13px] text-[#717171]">
                            ~{Math.round(o.heightM)} m AGL ·{" "}
                            {o.lat.toFixed(4)}, {o.lng.toFixed(4)}
                          </p>
                        </div>
                        <Link
                          href={mapHref}
                          className="as-press shrink-0 rounded-full border border-[#dddddd] px-3 py-1.5 text-[12px] font-semibold text-[#222222] hover:bg-[#f7f7f7]"
                        >
                          {t("viewOnMap")}
                        </Link>
                      </div>
                      {o.message ? (
                        <p className="mt-2 text-[13px] leading-relaxed text-[#222222]">
                          {o.message}
                        </p>
                      ) : null}
                      <p className="mt-2 text-[11px] text-[#b0b0b0]">
                        {new Date(o.createdAt).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-10 text-[13px] text-[#717171]">
          <Link
            href="/"
            className="font-semibold text-[#ff385c] hover:underline"
          >
            {t("backToMap")}
          </Link>
        </p>
      </div>
    </div>
  );
}
