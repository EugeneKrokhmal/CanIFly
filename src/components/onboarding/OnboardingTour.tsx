"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/stores/auth";
import {
  clearTourPending,
  isTourDone,
  markTourDone,
  markTourPending,
  shouldStartTour,
} from "@/lib/onboarding-tour";

type TourStep = {
  id: string;
  /** CSS selector for spotlight; null = centered card only */
  target: string | null;
  titleKey: string;
  bodyKey: string;
};

const STEPS: TourStep[] = [
  {
    id: "welcome",
    target: null,
    titleKey: "welcomeTitle",
    bodyKey: "welcomeBody",
  },
  {
    id: "map",
    target: '[data-tour="map"]',
    titleKey: "mapTitle",
    bodyKey: "mapBody",
  },
  {
    id: "traffic",
    target: '[data-tour="traffic"]',
    titleKey: "trafficTitle",
    bodyKey: "trafficBody",
  },
  {
    id: "flights",
    target: '[data-tour="flights"]',
    titleKey: "flightsTitle",
    bodyKey: "flightsBody",
  },
  {
    id: "pin",
    target: '[data-tour="add-pin"]',
    titleKey: "pinTitle",
    bodyKey: "pinBody",
  },
  {
    id: "account",
    target: '[data-tour="account"], [data-tour="menu"]',
    titleKey: "accountTitle",
    bodyKey: "accountBody",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function measureTarget(selector: string | null): Rect | null {
  if (!selector || typeof document === "undefined") return null;
  const nodes = document.querySelectorAll(selector);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const pad = 8;
    return {
      top: Math.max(0, r.top - pad),
      left: Math.max(0, r.left - pad),
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
  }
  return null;
}

export function OnboardingTour() {
  const t = useTranslations("tour");
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const searchParams = useSearchParams();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (isTourDone(user.id)) {
      clearTourPending();
      return;
    }
    const force = searchParams.get("tour") === "1";
    if (force) markTourPending();
    if (force || shouldStartTour(user.id)) {
      const timer = window.setTimeout(() => {
        setActive(true);
        requestAnimationFrame(() => setVisible(true));
      }, 700);
      return () => window.clearTimeout(timer);
    }
  }, [loading, user, searchParams]);

  const current = STEPS[step] ?? STEPS[0]!;

  const refreshSpot = useCallback(() => {
    setSpot(measureTarget(current.target));
  }, [current.target]);

  useEffect(() => {
    if (!active) return;
    refreshSpot();
    const onResize = () => refreshSpot();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    const id = window.setInterval(refreshSpot, 400);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.clearInterval(id);
    };
  }, [active, step, refreshSpot]);

  const finish = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => {
      if (user) markTourDone(user.id);
      else clearTourPending();
      setActive(false);
      setStep(0);
    }, 200);
  }, [user]);

  const next = () => {
    if (step >= STEPS.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  if (!active) return null;

  const cardBottom =
    spot && spot.top + spot.height > window.innerHeight * 0.55
      ? Math.max(16, window.innerHeight - spot.top + 12)
      : null;
  const cardTop =
    cardBottom == null && spot
      ? Math.min(window.innerHeight - 220, spot.top + spot.height + 12)
      : cardBottom == null
        ? undefined
        : undefined;

  return (
    <div
      className={[
        "fixed inset-0 z-[90] transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {/* Dim with optional hole */}
      <div className="absolute inset-0 pointer-events-auto" onClick={finish}>
        {spot ? (
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spot.left}
                  y={spot.top}
                  width={spot.width}
                  height={spot.height}
                  rx="16"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#tour-mask)"
            />
            <rect
              x={spot.left}
              y={spot.top}
              width={spot.width}
              height={spot.height}
              rx="16"
              fill="none"
              stroke="rgba(255,56,92,0.9)"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 bg-black/50" />
        )}
      </div>

      <div
        className={[
          "pointer-events-auto absolute left-1/2 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-4 shadow-[var(--as-shadow-lg)]",
          cardBottom != null || (spot && cardTop != null)
            ? "-translate-x-1/2"
            : "-translate-x-1/2 -translate-y-1/2",
        ].join(" ")}
        style={
          cardBottom != null
            ? { bottom: cardBottom }
            : spot && cardTop != null
              ? { top: cardTop }
              : { top: "50%" }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--as-ink-soft)]">
              {t("progress", { current: step + 1, total: STEPS.length })}
            </p>
            <h2
              id="tour-title"
              className="mt-1 text-[17px] font-semibold tracking-tight text-[var(--as-ink)]"
            >
              {t(current.titleKey as Parameters<typeof t>[0])}
            </h2>
          </div>
          <button
            type="button"
            onClick={finish}
            className="as-press grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--as-ink-soft)] hover:bg-[var(--as-hover)]"
            aria-label={t("skip")}
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
          {t(current.bodyKey as Parameters<typeof t>[0])}
        </p>
        {current.id === "flights" ? (
          <p className="mt-2 text-[13px]">
            <Link
              href="/guide/flights"
              className="font-semibold text-[#ff385c] hover:underline"
              onClick={finish}
            >
              {t("flightsGuideLink")}
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="as-press inline-flex items-center gap-1 rounded-full border border-[var(--as-line)] px-3 py-1.5 text-[13px] font-semibold text-[var(--as-ink)] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("back")}
          </button>
          <button
            type="button"
            onClick={next}
            className="as-press inline-flex items-center gap-1 rounded-full bg-[var(--as-ink)] px-4 py-1.5 text-[13px] font-semibold text-[var(--as-ink-invert)]"
          >
            {step >= STEPS.length - 1 ? t("done") : t("next")}
            {step < STEPS.length - 1 ? (
              <ChevronRight className="h-4 w-4" />
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}
