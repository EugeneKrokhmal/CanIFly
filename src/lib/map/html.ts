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
  <div class="as-ac-popup-hint">Loading track…</div>
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
  const photo = input.photoUrl?.startsWith("/uploads/obstacles/")
    ? `<img src="${escapeHtml(input.photoUrl)}" alt="" style="display:block;width:100%;max-height:140px;object-fit:cover;border-radius:8px;margin:8px 0" />`
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

export function airspacePopupHtml(input: {
  loading?: boolean;
  error?: string | null;
  status?: string | null;
  summary?: string | null;
  zoneNames?: string[];
  lat: number;
  lng: number;
}): string {
  if (input.loading) {
    return `<div class="as-ac-popup-inner">
  <strong>Checking airspace…</strong>
  <div class="as-ac-popup-hint">${escapeHtml(input.lat.toFixed(5))}°, ${escapeHtml(input.lng.toFixed(5))}°</div>
</div>`;
  }

  if (input.error) {
    return `<div class="as-ac-popup-inner">
  <strong style="color:#c13515">Couldn’t check</strong>
  <div>${escapeHtml(input.error)}</div>
</div>`;
  }

  const status = input.status ?? "clear";
  const color = STATUS_POPUP_COLOR[status] ?? "var(--as-ink)";
  const label = STATUS_POPUP_LABEL[status] ?? status;
  const zones =
    input.zoneNames && input.zoneNames.length > 0
      ? `<div style="margin-top:8px;font-size:12px;color:var(--as-ink-soft)">${escapeHtml(
          input.zoneNames.slice(0, 3).join(" · "),
        )}${input.zoneNames.length > 3 ? "…" : ""}</div>`
      : "";

  return `<div class="as-ac-popup-inner">
  <span style="display:inline-block;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;color:${color};background:${color}18">${escapeHtml(label)}</span>
  <div style="margin-top:8px">${escapeHtml(input.summary ?? "")}</div>
  ${zones}
  <div class="as-ac-popup-hint">${escapeHtml(input.lat.toFixed(5))}°, ${escapeHtml(input.lng.toFixed(5))}°</div>
</div>`;
}

