"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rankDefById, type PilotRankId } from "@/lib/pilot-rank";
import { PilotRankInsignia } from "@/components/pilots/PilotRankInsignia";

type TopPilot = {
  id: string;
  name: string;
  avatarUrl: string | null;
  pinCount: number;
  level: number;
  rankId?: PilotRankId;
  hours?: number;
  xp: number;
  rank: number;
};

const DISPLAY_LIMIT = 5;

export function TopPilotsStack() {
  const t = useTranslations("leaderboard");
  const tPilot = useTranslations("pilot");
  const [pilots, setPilots] = useState<TopPilot[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/pilots/top?limit=${DISPLAY_LIMIT}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { pilots?: TopPilot[] };
        if (!cancelled) setPilots(data.pilots ?? []);
      } catch {
        /* silent — decorative overlay */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || pilots.length === 0) return null;

  return (
    <aside
      className="pointer-events-none absolute bottom-5 right-5 z-20 hidden w-[220px] max-w-[220px] flex-col md:flex"
      aria-label={t("aria")}
    >
      <p className="pointer-events-none mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--as-ink-soft)]">
        {t("title")}
      </p>
      <div className="pointer-events-auto flex flex-col">
        {pilots.slice(0, DISPLAY_LIMIT).map((pilot, i) => {
          const rankId = pilot.rankId ?? "student";
          const def = rankDefById(rankId);
          const title = tPilot(`rank.${rankId}` as Parameters<typeof tPilot>[0]);
          return (
            <Link
              key={pilot.id}
              href={`/pilots/${pilot.id}`}
              className="relative flex max-h-[200px] w-full max-w-[220px] shrink-0 items-center gap-2 border border-[var(--as-line-soft)] bg-[var(--as-surface)] my-2.5 px-2 py-2 shadow-[var(--as-shadow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--as-ink)]"
              style={{
                zIndex: pilots.length - i,
                marginTop: i === 0 ? 0 : -6,
                borderRadius: i === 0 ? "14px 14px 10px 10px" : "10px",
              }}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--as-surface-muted)] text-[11px] font-bold tabular-nums text-[var(--as-ink)]"
                aria-hidden
              >
                {pilot.rank}
              </span>
              <span className="as-avatar-rank as-avatar-rank--stack">
                <span className="as-avatar-rank__photo">
                  {pilot.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pilot.avatarUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    pilot.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <PilotRankInsignia
                  className="as-avatar-rank__epaulette"
                  insignia={def.insignia}
                  title={title}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold leading-tight text-[var(--as-ink)]">
                  {pilot.name}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--as-ink-soft)]">
                  {title}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
