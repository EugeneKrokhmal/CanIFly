"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import { type AirspaceStatus } from "@canifly/middleware";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { useObstaclesStore } from "@/stores/obstacles";
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
  const tStatus = useTranslations("status");
  const status = useDroneProfileStore((s) => s.status);
  const summary = useDroneProfileStore((s) => s.summary);
  const loading = useDroneProfileStore((s) => s.statusLoading);
  const selectedPoint = useDroneProfileStore((s) => s.selectedPoint);
  const placementMode = useObstaclesStore((s) => s.placementMode);

  /** Don't mount on desktop — `md:hidden` alone still leaves a tall absolute sheet in the tree. */
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [panelReady, setPanelReady] = useState(false);
  const [maxH, setMaxH] = useState(SHEET_FALLBACK_H);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const sheetRef = useRef<HTMLDivElement | null>(null);
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

  if (!isMobile || placementMode) return null;

  return (
    <>
      <button
        ref={backdropRef}
        type="button"
        className="fixed inset-0 z-40 bg-black/30"
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
        className="absolute inset-x-0 bottom-0 z-50 flex max-w-none flex-col overflow-hidden rounded-t-3xl border border-b-0 border-[var(--as-line-soft)] bg-[var(--as-surface)] shadow-[0_-8px_30px_rgba(0,0,0,0.14)] will-change-transform"
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
          <span className="mt-2 mb-2 h-1 w-10 rounded-full bg-[var(--as-line)]" />
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
                  <p className="text-[14px] font-semibold text-[var(--as-ink-soft)]">
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
                      {tStatus(status)}
                    </span>
                    <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-[var(--as-ink-soft)]">
                      {summary}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold text-[var(--as-ink)]">
                      {t("tapToCheck")}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[var(--as-ink-soft)]">
                      {t("swipeUpControls")}
                      {selectedPoint ? "" : t("locateHint")}
                    </p>
                  </>
                )}
              </div>
              <span className="shrink-0 text-[12px] font-semibold text-[var(--as-muted)]">
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
          {panelReady ? (
            <SidebarPanel
              sheetDragProps={{
                onPointerDown,
                onPointerMove,
                onPointerUp,
                onPointerCancel: onPointerUp,
              }}
            />
          ) : null}
        </div>
      </div>
    </>
  );
});
