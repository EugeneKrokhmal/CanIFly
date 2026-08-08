"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Camera,
  Clock,
  Gauge,
  MapPin,
  Plane,
  Route,
  Ruler,
  Sparkles,
  MapPinned,
  Award,
  IdCard,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  computePilotProgress,
  type PilotRankStats,
} from "@/lib/pilot-rank";
import { PilotRankInsignia } from "@/components/pilots/PilotRankInsignia";
import { AchievementEpaulette } from "@/components/pilots/AchievementEpaulette";

export type PilotBadgeId =
  | "joined"
  | "first_flight"
  | "flights_10"
  | "distance_10km"
  | "distance_100km"
  | "airtime_1h"
  | "high_flyer"
  | "gps_track"
  | "first_pin"
  | "pins_10"
  | "fly_spot"
  | "photo_pin"
  | "operator";

export type PilotBadge = {
  id: PilotBadgeId;
  earned: boolean;
  earnedAt: string | null;
};

const BADGE_ICON: Record<PilotBadgeId, LucideIcon> = {
  joined: UserPlus,
  first_flight: Plane,
  flights_10: Award,
  distance_10km: Ruler,
  distance_100km: Gauge,
  airtime_1h: Clock,
  high_flyer: Sparkles,
  gps_track: Route,
  first_pin: MapPin,
  pins_10: MapPinned,
  fly_spot: BadgeCheck,
  photo_pin: Camera,
  operator: IdCard,
};

const PAGE_SIZE = 4;

const BADGE_METAL: Record<PilotBadgeId, "gold" | "silver"> = {
  joined: "gold",
  first_flight: "silver",
  flights_10: "gold",
  distance_10km: "silver",
  distance_100km: "gold",
  airtime_1h: "silver",
  high_flyer: "gold",
  gps_track: "silver",
  first_pin: "silver",
  pins_10: "gold",
  fly_spot: "gold",
  photo_pin: "silver",
  operator: "gold",
};

function formatHours(hours: number): string {
  if (hours >= 100) return hours.toFixed(0);
  return hours.toFixed(1);
}

function BadgeSlideItem({ badge }: { badge: PilotBadge }) {
  const t = useTranslations("pilot");
  const Icon = BADGE_ICON[badge.id];
  const title = t(`badge.${badge.id}.title` as Parameters<typeof t>[0]);
  const hint = t(`badge.${badge.id}.hint` as Parameters<typeof t>[0]);
  return (
    <div className="min-w-0 flex-[1_1_0] basis-0" title={hint}>
      <div className="flex flex-col items-center text-center">
        <AchievementEpaulette
          Icon={Icon}
          earned={badge.earned}
          metal={BADGE_METAL[badge.id]}
          title={title}
        />
        <p
          className={[
            "mt-2 line-clamp-2 text-[11px] font-semibold leading-tight sm:text-[12px]",
            badge.earned ? "text-[var(--as-ink)]" : "text-[var(--as-ink-soft)]",
          ].join(" ")}
        >
          {title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[var(--as-ink-soft)] sm:text-[10px]">
          {hint}
        </p>
      </div>
    </div>
  );
}

type Props = {
  badges: PilotBadge[];
  stats: PilotRankStats;
};

export function PilotBadges({ badges, stats }: Props) {
  const t = useTranslations("pilot");
  const earnedCount = badges.filter((b) => b.earned).length;
  const progress = computePilotProgress(stats);
  const pageCount = Math.max(1, Math.ceil(badges.length / PAGE_SIZE));
  const [page, setPage] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  useEffect(() => {
    setPage(0);
  }, [badges]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const canPrev = page > 0;
  const canNext = page < pageCount - 1;
  const pages = Array.from({ length: pageCount }, (_, i) =>
    badges.slice(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE),
  );

  return (
    <section
      className="mt-8"
      aria-label={t("badgesHeading", { count: earnedCount })}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[12px] font-semibold text-[var(--as-ink)]">
          {t("rankHeading")}
        </h2>
        <p className="text-[11px] tabular-nums text-[var(--as-ink-soft)]">
          {t("rankHours", { hours: formatHours(progress.hours) })}
        </p>
      </div>

      <div className="as-level mt-3">
        <PilotRankInsignia
          className="as-level__epaulette"
          insignia={progress.rank.insignia}
          title={t(`rank.${progress.rank.id}` as Parameters<typeof t>[0])}
        />
        <div className="as-level__meta">
          <p className="as-level__title">
            {t(`rank.${progress.rank.id}` as Parameters<typeof t>[0])}
          </p>
          {progress.next ? (
            <>
              <div className="as-level__bar" aria-hidden>
                <div
                  className="as-level__bar-fill"
                  style={{ width: `${Math.round(progress.progress * 100)}%` }}
                />
              </div>
              <p className="as-level__hint">
                {t("rankHoursNext", {
                  current: formatHours(progress.hoursIntoRank),
                  next: formatHours(progress.hoursForNext),
                  rank: t(`rank.${progress.next.id}` as Parameters<typeof t>[0]),
                })}
              </p>
              {progress.bonusHours > 0.05 ? (
                <p className="as-level__hint as-level__hint--soft">
                  {t("rankBoost", {
                    airtime: formatHours(progress.airtimeHours),
                    bonus: formatHours(progress.bonusHours),
                  })}
                </p>
              ) : null}
            </>
          ) : (
            <p className="as-level__hint">{t("rankMax")}</p>
          )}
        </div>
      </div>

      {earnedCount === 0 ? (
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
          {t("badgesEmpty")}
        </p>
      ) : null}

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="text-[12px] font-semibold text-[var(--as-ink)]">
          {t("badgesHeading", { count: earnedCount })}
        </h3>
        {pageCount > 1 ? (
          <p className="text-[11px] tabular-nums text-[var(--as-ink-soft)]">
            {page + 1}/{pageCount}
          </p>
        ) : null}
      </div>

      <div className="relative mt-3">
        {pageCount > 1 ? (
          <>
            <button
              type="button"
              aria-label={t("badgesPrev")}
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="as-press absolute left-0 top-[1.75rem] z-10 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] text-[var(--as-ink)] shadow-[var(--as-shadow)] disabled:pointer-events-none disabled:opacity-30 sm:top-[2rem] sm:h-10 sm:w-10"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label={t("badgesNext")}
              disabled={!canNext}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="as-press absolute right-0 top-[1.75rem] z-10 grid h-9 w-9 translate-x-1/2 place-items-center rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] text-[var(--as-ink)] shadow-[var(--as-shadow)] disabled:pointer-events-none disabled:opacity-30 sm:top-[2rem] sm:h-10 sm:w-10"
            >
              <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </>
        ) : null}

        <div className="overflow-hidden px-1 py-2 sm:px-2">
          <div
            className="flex"
            style={{
              width: `${pageCount * 100}%`,
              transform: `translate3d(-${(page * 100) / pageCount}%, 0, 0)`,
              transition: reduceMotion
                ? "none"
                : "transform 420ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {pages.map((group, pageIdx) => (
              <ul
                key={pageIdx}
                className="m-0 flex list-none gap-1.5 p-0 sm:gap-2.5"
                style={{ width: `${100 / pageCount}%` }}
                aria-hidden={pageIdx !== page}
              >
                {Array.from({ length: PAGE_SIZE }).map((_, slot) => {
                  const badge = group[slot];
                  return (
                    <li
                      key={badge?.id ?? `empty-${pageIdx}-${slot}`}
                      className="min-w-0 flex-[1_1_0] basis-0"
                    >
                      {badge ? <BadgeSlideItem badge={badge} /> : null}
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
