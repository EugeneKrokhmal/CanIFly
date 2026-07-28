"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { statusLabel, type AirspaceStatus } from "@canifly/middleware";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { SidebarPanel } from "@/components/sidebar/SidebarPanel";

const PEEK_PX = 108;
const EXPANDED_RATIO = 0.78;
/** SSR + first client paint must match; real viewport height applied after mount. */
const SHEET_FALLBACK_H = 600;

function statusColor(status: AirspaceStatus): string {
  if (status === "clear" || status === "limited") return "var(--as-clear)";
  if (status === "restricted") return "var(--as-restricted)";
  return "var(--as-prohibited)";
}

function maxSheetHeight(): number {
  return Math.round(window.innerHeight * EXPANDED_RATIO);
}

/**
 * Transform-based bottom sheet: drag updates DOM only (no React re-renders),
 * snap commits state once. Keeps 60fps on mobile.
 */
export const MobileFlightSheet = memo(function MobileFlightSheet() {
  const t = useTranslations("map");
  const locale = useLocale() as "es" | "en";
  const status = useDroneProfileStore((s) => s.status);
  const summary = useDroneProfileStore((s) => s.summary);
  const loading = useDroneProfileStore((s) => s.statusLoading);
  const selectedPoint = useDroneProfileStore((s) => s.selectedPoint);
  const locateAndFocus = useDroneProfileStore((s) => s.locateAndFocus);

  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [panelReady, setPanelReady] = useState(false);
  const [maxH, setMaxH] = useState(SHEET_FALLBACK_H);

  const sheetRef = useRef<HTMLDivElement | null>(null);
  const locateRef = useRef<HTMLButtonElement | null>(null);
  const backdropRef = useRef<HTMLButtonElement | null>(null);
  const visibleRef = useRef(PEEK_PX);
  const dragRef = useRef<{
    startY: number;
    startVisible: number;
    moved: boolean;
  } | null>(null);

  const applyVisible = useCallback(
    (visible: number, withTransition: boolean) => {
      const max = maxH;
      const clamped = Math.max(PEEK_PX, Math.min(max, visible));
      visibleRef.current = clamped;
      const el = sheetRef.current;
      if (el) {
        const y = max - clamped;
        el.style.transition = withTransition
          ? "transform 320ms var(--as-ease-out)"
          : "none";
        el.style.transform = `translate3d(0, ${y}px, 0)`;
      }
      const locate = locateRef.current;
      if (locate) {
        locate.style.transition = withTransition
          ? "bottom 320ms var(--as-ease-out)"
          : "none";
        locate.style.bottom = `calc(${Math.min(clamped, PEEK_PX + 24)}px + 0.75rem + env(safe-area-inset-bottom))`;
      }
      const backdrop = backdropRef.current;
      if (backdrop) {
        const ratio = (clamped - PEEK_PX) / Math.max(1, max - PEEK_PX);
        backdrop.style.opacity = String(Math.min(1, Math.max(0, ratio)));
        backdrop.style.pointerEvents = ratio > 0.15 ? "auto" : "none";
      }
    },
    [maxH],
  );

  useEffect(() => {
    setMaxH(maxSheetHeight());
    const onResize = () => setMaxH(maxSheetHeight());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    applyVisible(expanded ? maxH : PEEK_PX, true);
  }, [expanded, maxH, applyVisible]);

  useEffect(() => {
    if (expanded) setPanelReady(true);
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const snapTo = useCallback(
    (visible: number) => {
      const mid = (PEEK_PX + maxH) / 2;
      const open = visible >= mid;
      setExpanded(open);
      applyVisible(open ? maxH : PEEK_PX, true);
    },
    [applyVisible, maxH],
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      startY: e.clientY,
      startVisible: visibleRef.current,
      moved: false,
    };
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = drag.startY - e.clientY;
    if (Math.abs(delta) > 6) drag.moved = true;
    applyVisible(drag.startVisible + delta, false);
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) {
      snapTo(visibleRef.current <= PEEK_PX + 8 ? maxH : PEEK_PX);
      return;
    }
    snapTo(visibleRef.current);
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locateAndFocus({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <>
      <button
        ref={locateRef}
        type="button"
        onClick={locate}
        className="as-press as-gpu absolute right-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#dddddd] bg-white text-[#222222] shadow-[0_2px_12px_rgba(0,0,0,0.12)] md:hidden"
        style={{
          bottom: `calc(${PEEK_PX}px + 0.75rem + env(safe-area-inset-bottom))`,
        }}
        aria-label={t("locateMe")}
      >
        <LocateIcon />
      </button>

      <button
        ref={backdropRef}
        type="button"
        className="as-gpu fixed inset-0 z-40 bg-black/30 md:hidden"
        style={{
          opacity: 0,
          pointerEvents: "none",
          transition: dragging ? "none" : "opacity 280ms var(--as-ease-out)",
        }}
        aria-label={t("collapsePanel")}
        onClick={() => snapTo(PEEK_PX)}
      />

      <div
        ref={sheetRef}
        className="as-gpu absolute inset-x-0 bottom-0 z-50 flex max-w-none flex-col overflow-hidden rounded-t-3xl border border-b-0 border-[#ebebeb] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.14)] will-change-transform md:hidden"
        style={{
          height: `${maxH}px`,
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: `translate3d(0, ${maxH - PEEK_PX}px, 0)`,
          touchAction: "none",
        }}
        role="dialog"
        aria-label={t("flightControls")}
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <span className="mt-2 mb-2 h-1 w-10 rounded-full bg-[#dddddd]" />
          <div
            className="w-full px-4 pb-3"
            style={{
              opacity: expanded ? 0 : 1,
              maxHeight: expanded ? 0 : 96,
              overflow: "hidden",
              transition: dragging
                ? "none"
                : "opacity 180ms var(--as-ease-out), max-height 280ms var(--as-ease-out)",
              pointerEvents: expanded ? "none" : "auto",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {loading ? (
                  <p className="text-[14px] font-semibold text-[#717171]">
                    {t("checkingAirspace")}
                  </p>
                ) : status ? (
                  <>
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold"
                      style={{
                        color: statusColor(status),
                        background: `${statusColor(status)}18`,
                      }}
                    >
                      {statusLabel(status, locale)}
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-[#717171]">
                      {summary}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-[#222222]">
                      {t("tapToCheck")}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#717171]">
                      {t("swipeUpControls")}
                      {selectedPoint ? "" : t("locateHint")}
                    </p>
                  </>
                )}
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-[#b0b0b0]">
                {t("swipeUp")}
              </span>
            </div>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-hidden"
          style={{
            opacity: expanded ? 1 : 0,
            pointerEvents: expanded ? "auto" : "none",
            touchAction: "pan-y",
            transition: dragging ? "none" : "opacity 200ms var(--as-ease-out)",
            contentVisibility: expanded ? "visible" : "auto",
          }}
        >
          {panelReady ? <SidebarPanel /> : null}
        </div>
      </div>
    </>
  );
});

function LocateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v3M12 19v3M2 12h3M19 12h3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
    </svg>
  );
}
