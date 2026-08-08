import { rankEpauletteSvgForId } from "@/lib/map/rank-epaulette-svg";
import type { PilotRankId } from "@/lib/pilot-rank";

/** Escape text for safe insertion into HTML attribute/text contexts. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function aircraftPopupHtml(input: {
  title: string;
  lines: string[];
}): string {
  const body = input.lines
    .filter((line) => line.trim().length > 0)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  return `<div class="as-ac-popup-inner">
  <strong>${escapeHtml(input.title)}</strong>
  ${body}
</div>`;
}

export function flightPopupHtml(input: {
  aircraftName: string;
  startedAt: string | null;
  durationS: number;
  distanceM: number;
  maxHeightM: number | null;
  maxHSpeedMps?: number | null;
  altitudeM?: number | null;
  hasTrack: boolean;
  authorName?: string | null;
  authorHref?: string | null;
  authorAvatarUrl?: string | null;
  authorRankId?: PilotRankId | string | null;
  startLat?: number | null;
  startLng?: number | null;
}): string {
  let when = "";
  let whenShort = "";
  if (input.startedAt) {
    const d = new Date(input.startedAt);
    if (!Number.isNaN(d.getTime())) {
      when = d.toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      whenShort = d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  const totalS = Math.max(0, Math.round(input.durationS || 0));
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  const duration =
    h > 0
      ? `${h}h ${String(m).padStart(2, "0")}m`
      : m > 0
        ? `${m}m ${String(s).padStart(2, "0")}s`
        : `${s}s`;

  const distKm = (input.distanceM || 0) / 1000;
  const distanceValue =
    distKm >= 1
      ? distKm.toFixed(2)
      : String(Math.round(input.distanceM || 0));
  const distanceUnit = distKm >= 1 ? "km" : "m";

  const heightValue =
    input.maxHeightM != null && Number.isFinite(input.maxHeightM)
      ? String(Math.round(input.maxHeightM))
      : null;

  const speedValue =
    input.maxHSpeedMps != null &&
    Number.isFinite(input.maxHSpeedMps) &&
    input.maxHSpeedMps > 0
      ? (input.maxHSpeedMps * 3.6).toFixed(1)
      : null;

  const hereAlt =
    input.altitudeM != null && Number.isFinite(input.altitudeM)
      ? Math.round(input.altitudeM)
      : null;

  const authorInitial = (input.authorName ?? "P").trim().charAt(0).toUpperCase() || "P";
  const avatarInner = input.authorAvatarUrl
    ? `<img class="as-flight-popup__avatar-img" src="${escapeHtml(input.authorAvatarUrl)}" alt="" width="36" height="36" decoding="async" />`
    : `<span class="as-flight-popup__avatar" aria-hidden="true">${escapeHtml(authorInitial)}</span>`;
  const rankSvg = rankEpauletteSvgForId(input.authorRankId, {
    uid: `fp${Math.random().toString(36).slice(2, 7)}`,
    className: "as-avatar-rank__epaulette",
  });
  const avatar = `<span class="as-avatar-rank as-avatar-rank--popup">${avatarInner}${rankSvg}</span>`;

  const authorBlock = input.authorName
    ? input.authorHref
      ? `<a class="as-flight-popup__athlete" href="${escapeHtml(input.authorHref)}">
          ${avatar}
          <span class="as-flight-popup__athlete-meta">
            <span class="as-flight-popup__athlete-name">${escapeHtml(input.authorName)}</span>
            <span class="as-flight-popup__athlete-sub">${escapeHtml(when || "Flight")}</span>
          </span>
        </a>`
      : `<div class="as-flight-popup__athlete">
          ${avatar}
          <span class="as-flight-popup__athlete-meta">
            <span class="as-flight-popup__athlete-name">${escapeHtml(input.authorName)}</span>
            <span class="as-flight-popup__athlete-sub">${escapeHtml(when || "Flight")}</span>
          </span>
        </div>`
    : `<div class="as-flight-popup__athlete">
        <span class="as-flight-popup__avatar as-flight-popup__avatar--drone" aria-hidden="true">D</span>
        <span class="as-flight-popup__athlete-meta">
          <span class="as-flight-popup__athlete-name">${escapeHtml(input.aircraftName || "Flight")}</span>
          <span class="as-flight-popup__athlete-sub">${escapeHtml(when || whenShort || "Flight")}</span>
        </span>
      </div>`;

  const metrics = [
    `<div class="as-flight-popup__metric">
      <div class="as-flight-popup__metric-label">Distance</div>
      <div class="as-flight-popup__metric-value">${escapeHtml(distanceValue)}<span class="as-flight-popup__metric-unit">${escapeHtml(distanceUnit)}</span></div>
    </div>`,
    `<div class="as-flight-popup__metric">
      <div class="as-flight-popup__metric-label">Time</div>
      <div class="as-flight-popup__metric-value as-flight-popup__metric-value--sm">${escapeHtml(duration)}</div>
    </div>`,
  ];

  if (heightValue != null) {
    metrics.push(`<div class="as-flight-popup__metric">
      <div class="as-flight-popup__metric-label">Max elev.</div>
      <div class="as-flight-popup__metric-value">${escapeHtml(heightValue)}<span class="as-flight-popup__metric-unit">m</span></div>
    </div>`);
  }

  const extras: string[] = [];
  if (speedValue != null) {
    extras.push(
      `<span><strong>${escapeHtml(speedValue)}</strong> km/h max</span>`,
    );
  }
  if (hereAlt != null) {
    extras.push(`<span><strong>${escapeHtml(String(hereAlt))}</strong> m here</span>`);
  }
  extras.push(
    `<span>${input.hasTrack ? "GPS track" : "Takeoff only"}</span>`,
  );

  const titleRow =
    input.authorName
      ? `<div class="as-flight-popup__title">${escapeHtml(
          input.aircraftName || "Drone flight",
        )}</div>`
      : "";

  return `<div class="as-ac-popup-inner as-flight-popup">
  ${authorBlock}
  ${titleRow}
  <div class="as-flight-popup__metrics">${metrics.join("")}</div>
  <div class="as-flight-popup__extras">${extras.join('<span class="as-flight-popup__dot" aria-hidden="true">·</span>')}</div>
</div>`;
}

export function obstaclePopupHtml(input: {
  title: string;
  kindLabel?: string | null;
  heightM: number;
  heightLabel?: string;
  message?: string | null;
  photoUrl?: string | null;
  authorName?: string | null;
  authorId?: string | null;
  /** Locale-aware path, e.g. /en/pilots/... */
  authorHref?: string | null;
  createdAt?: string | null;
  canDelete?: boolean;
  id?: string;
  likes?: number;
  dislikes?: number;
  myVote?: "up" | "down" | null;
  inactive?: boolean;
  canVote?: boolean;
}): string {
  const msg = input.message?.trim();
  const photo = input.photoUrl
    ? `<img src="${escapeHtml(input.photoUrl)}" alt="" loading="lazy" decoding="async" style="display:block;width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin:8px 0" />`
    : "";

  let dateLabel = "";
  if (input.createdAt) {
    const d = new Date(input.createdAt);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  const authorLink =
    input.authorName && input.authorId
      ? `<a href="${escapeHtml(input.authorHref ?? `/pilots/${input.authorId}`)}" style="color:var(--as-ink);font-weight:600;text-decoration:underline;text-underline-offset:2px">${escapeHtml(input.authorName)}</a>`
      : input.authorName
        ? escapeHtml(input.authorName)
        : "";

  const metaParts: string[] = [];
  if (authorLink) metaParts.push(`by ${authorLink}`);
  if (dateLabel) metaParts.push(escapeHtml(dateLabel));
  const meta =
    metaParts.length > 0
      ? `<div style="margin-top:8px;font-size:12px;color:var(--as-ink-soft)">${metaParts.join(" · ")}</div>`
      : "";

  const del =
    input.canDelete && input.id
      ? `<button type="button" data-obstacle-delete="${escapeHtml(input.id)}" class="as-obstacle-delete" style="margin-top:8px;border:0;background:transparent;color:#c13515;font:inherit;font-weight:600;cursor:pointer;padding:0">Delete</button>`
      : "";

  const likes = input.likes ?? 0;
  const dislikes = input.dislikes ?? 0;
  const myVote = input.myVote ?? null;
  const inactive = Boolean(input.inactive);
  const canVote = Boolean(input.canVote && input.id);
  const upActive = myVote === "up";
  const downActive = myVote === "down";

  const voteRow = input.id
    ? `<div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
  <button type="button" data-obstacle-vote="up" data-obstacle-id="${escapeHtml(input.id)}" ${canVote ? "" : "disabled "}style="border:1px solid ${upActive ? "var(--as-clear)" : "var(--as-line)"};background:${upActive ? "color-mix(in srgb, var(--as-clear) 14%, transparent)" : "var(--as-surface)"};color:${upActive ? "var(--as-clear)" : "var(--as-ink)"};border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;font-weight:600;cursor:${canVote ? "pointer" : "default"};opacity:${canVote ? "1" : "0.7"}">▲ ${escapeHtml(likes)}</button>
  <button type="button" data-obstacle-vote="down" data-obstacle-id="${escapeHtml(input.id)}" ${canVote ? "" : "disabled "}style="border:1px solid ${downActive ? "var(--as-prohibited)" : "var(--as-line)"};background:${downActive ? "color-mix(in srgb, var(--as-prohibited) 14%, transparent)" : "var(--as-surface)"};color:${downActive ? "var(--as-prohibited)" : "var(--as-ink)"};border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;font-weight:600;cursor:${canVote ? "pointer" : "default"};opacity:${canVote ? "1" : "0.7"}">▼ ${escapeHtml(dislikes)}</button>
  ${inactive ? `<span style="font-size:11px;font-weight:600;color:var(--as-ink-soft)">Inactive</span>` : ""}
</div>`
    : "";

  const kindChip = input.kindLabel
    ? `<div style="margin-bottom:4px;font-size:11px;font-weight:600;color:var(--as-ink-soft);text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(input.kindLabel)}</div>`
    : "";
  const heightText = input.heightLabel ?? `~${input.heightM} m AGL`;

  return `<div class="as-ac-popup-inner">
  ${kindChip}
  <strong>${escapeHtml(input.title)}</strong>
  <div>${escapeHtml(heightText)}</div>
  ${msg ? `<div>${escapeHtml(msg)}</div>` : ""}
  ${photo}
  ${meta}
  ${voteRow}
  ${del}
</div>`;
}


const STATUS_POPUP_COLOR: Record<string, string> = {
  clear: "#008a05",
  limited: "#008a05",
  restricted: "#e07912",
  prohibited: "#c13515",
};

const STATUS_POPUP_LABEL: Record<string, string> = {
  clear: "Clear",
  limited: "Limited",
  restricted: "Restricted",
  prohibited: "Prohibited",
};

function airspacePopupCoords(lat: number, lng: number): string {
  return `<div class="as-ac-popup-hint">${escapeHtml(lat.toFixed(5))}°, ${escapeHtml(lng.toFixed(5))}°</div>`;
}

function airspacePopupSkeleton(): string {
  return `<div class="as-ac-popup-status-body" aria-hidden="true">
  <span class="as-ac-popup-skeleton as-ac-popup-skeleton-pill"></span>
  <span class="as-ac-popup-skeleton as-ac-popup-skeleton-line"></span>
  <span class="as-ac-popup-skeleton as-ac-popup-skeleton-line as-ac-popup-skeleton-line--short"></span>
  <span class="as-ac-popup-skeleton as-ac-popup-skeleton-line as-ac-popup-skeleton-line--zone"></span>
</div>`;
}

export function airspacePopupHtml(input: {
  loading?: boolean;
  error?: string | null;
  status?: string | null;
  summary?: string | null;
  zoneNames?: string[];
  lat: number;
  lng: number;
}): string {
  const coords = airspacePopupCoords(input.lat, input.lng);

  if (input.loading) {
    return `<div class="as-ac-popup-inner as-ac-popup-status as-ac-popup-status--loading">
  ${airspacePopupSkeleton()}
  ${coords}
</div>`;
  }

  if (input.error) {
    return `<div class="as-ac-popup-inner as-ac-popup-status">
  <div class="as-ac-popup-status-body">
    <strong class="as-ac-popup-status-error">Couldn’t check</strong>
    <div class="as-ac-popup-status-summary">${escapeHtml(input.error)}</div>
  </div>
  ${coords}
</div>`;
  }

  const status = input.status ?? "clear";
  const color = STATUS_POPUP_COLOR[status] ?? "var(--as-ink)";
  const label = STATUS_POPUP_LABEL[status] ?? status;
  const zones =
    input.zoneNames && input.zoneNames.length > 0
      ? `<div class="as-ac-popup-status-zones">${escapeHtml(
          input.zoneNames.slice(0, 3).join(" · "),
        )}${input.zoneNames.length > 3 ? "…" : ""}</div>`
      : "";

  return `<div class="as-ac-popup-inner as-ac-popup-status">
  <div class="as-ac-popup-status-body">
    <span class="as-ac-popup-status-badge" style="color:${color};background:${color}18">${escapeHtml(label)}</span>
    <div class="as-ac-popup-status-summary">${escapeHtml(input.summary ?? "")}</div>
    ${zones}
  </div>
  ${coords}
</div>`;
}

