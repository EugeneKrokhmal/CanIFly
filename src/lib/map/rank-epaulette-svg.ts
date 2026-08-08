import {
  rankDefById,
  type PilotRankId,
  type RankInsignia,
} from "@/lib/pilot-rank";

export const EPAULETTE = {
  silver: "#c8ced6",
  silverHi: "#eef1f5",
  gold: "#d4af37",
  goldHi: "#f0d78a",
  goldLo: "#8a6e32",
  plate: "#141414",
  border: "#c5a35a",
} as const;

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const b = a + Math.PI / 5;
    pts.push(
      `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`,
      `${cx + Math.cos(b) * r * 0.42},${cy + Math.sin(b) * r * 0.42}`,
    );
  }
  return pts.join(" ");
}

function metalStops(metal: "gold" | "silver") {
  if (metal === "silver") {
    return {
      hi: EPAULETTE.silverHi,
      mid: EPAULETTE.silver,
      lo: "#9aa3ad",
    };
  }
  return {
    hi: EPAULETTE.goldHi,
    mid: EPAULETTE.gold,
    lo: EPAULETTE.goldLo,
  };
}

function rankMarksSvg(insignia: RankInsignia, metalId: string): string {
  if (insignia.style === "bars") {
    const n = insignia.count;
    const barW = 5;
    const gap = 5.5;
    const total = n * barW + (n - 1) * gap;
    const startX = 34 + (42 - total) / 2;
    let marks = "";
    for (let i = 0; i < n; i++) {
      marks += `<rect x="${startX + i * (barW + gap)}" y="10" width="${barW}" height="28" rx="1.5" fill="url(#${metalId})"/>`;
    }
    return marks;
  }

  let marks = "";
  for (let i = 0; i < insignia.chevrons; i++) {
    const x = 30 + i * 10;
    marks += `<path d="M${x} 17 L${x + 9} 24 L${x} 31 L${x + 3.2} 31 L${x + 12.2} 24 L${x + 3.2} 17 Z" fill="url(#${metalId})"/>`;
  }
  const left = 30 + insignia.chevrons * 10 + 8;
  for (let i = 0; i < insignia.stars; i++) {
    marks += `<polygon points="${starPoints(left + i * 13, 24, 5)}" fill="url(#${metalId})"/>`;
  }
  return marks;
}

export type EpauletteSvgOpts = {
  uid: string;
  className?: string;
  metal?: "gold" | "silver";
  /** Soften plate when locked / unearned. */
  earned?: boolean;
  /** Extra markup inside the plate (bars, wash, etc.). */
  marksHtml?: string;
  /** Soft metal wash on the right field (achievements). */
  fieldWash?: boolean;
};

/**
 * Shared epaulette plate SVG — used by rank marks and achievement badges.
 */
export function epaulettePlateSvg(opts: EpauletteSvgOpts): string {
  const {
    uid,
    className,
    metal = "gold",
    earned = true,
    marksHtml = "",
    fieldWash = false,
  } = opts;
  const plateId = `p-${uid}`;
  const metalId = `m-${uid}`;
  const rimId = `r-${uid}`;
  const stops = metalStops(metal);
  const plateTop = earned ? "#222" : "#3a3a3a";
  const plateBot = earned ? EPAULETTE.plate : "#2a2a2a";
  const rim0 = earned ? "#f0d78a" : "#9aa0a8";
  const rim1 = earned ? EPAULETTE.border : "#7a8088";
  const rim2 = earned ? "#8a6e32" : "#5a6068";
  const metalHi = earned ? stops.hi : "#b0b4ba";
  const metalMid = earned ? stops.mid : "#8e949c";
  const metalLo = earned ? stops.lo : "#6a7078";
  const cls = className ? ` class="${className}"` : "";
  const wash = fieldWash
    ? `<rect x="28" y="10" width="50" height="28" rx="3" fill="url(#${metalId})" opacity="${earned ? 0.22 : 0.12}"/>`
    : "";

  return `<svg${cls} viewBox="0 0 88 48" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${plateId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${plateTop}"/><stop offset="100%" stop-color="${plateBot}"/>
    </linearGradient>
    <linearGradient id="${metalId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${metalHi}"/><stop offset="55%" stop-color="${metalMid}"/><stop offset="100%" stop-color="${metalLo}"/>
    </linearGradient>
    <linearGradient id="${rimId}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${rim0}"/><stop offset="50%" stop-color="${rim1}"/><stop offset="100%" stop-color="${rim2}"/>
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="85" height="45" rx="5" fill="url(#${plateId})" stroke="url(#${rimId})" stroke-width="2"/>
  <rect x="8" y="6" width="14" height="36" rx="2" fill="#0c0c0c"/>
  <circle cx="15" cy="24" r="5.2" fill="url(#${metalId})"/>
  <circle cx="15" cy="24" r="2.6" fill="${EPAULETTE.plate}"/>
  ${wash}
  ${marksHtml}
</svg>`;
}

/**
 * Inline SVG epaulette for MapLibre HTML popups and React wrappers.
 */
export function rankEpauletteSvg(
  insignia: RankInsignia,
  opts?: { uid?: string; className?: string },
): string {
  const uid = opts?.uid ?? `rk${Math.random().toString(36).slice(2, 8)}`;
  const metal = insignia.style === "bars" ? insignia.metal : "gold";
  const metalId = `m-${uid}`;
  return epaulettePlateSvg({
    uid,
    className: opts?.className,
    metal,
    earned: true,
    marksHtml: rankMarksSvg(insignia, metalId),
  });
}

export function rankEpauletteSvgForId(
  rankId: PilotRankId | string | null | undefined,
  opts?: { uid?: string; className?: string },
): string {
  const id = (rankId as PilotRankId) || "student";
  return rankEpauletteSvg(rankDefById(id).insignia, opts);
}
