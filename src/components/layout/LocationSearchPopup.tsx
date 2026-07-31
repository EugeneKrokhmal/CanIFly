"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  searchLocations,
  type GeocodeHit,
} from "@/lib/geocode/open-meteo";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useDroneProfileStore } from "@/stores/drone-profile";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";

type LocationSearchPopupProps = {
  open: boolean;
  onClose: () => void;
};

export function LocationSearchPopup({
  open,
  onClose,
}: LocationSearchPopupProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const locateAndFocus = useDroneProfileStore((s) => s.locateAndFocus);
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const tOut = window.setTimeout(() => setMounted(false), 220);
    return () => window.clearTimeout(tOut);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setError(null);
    setLoading(false);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const runSearch = useDebouncedCallback((q: string) => {
    abortRef.current?.abort();
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const results = await searchLocations(trimmed, {
          language: locale,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setHits(results);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setHits([]);
        setError(t("error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
  }, 320);

  if (!mounted) return null;

  const pick = (hit: GeocodeHit) => {
    locateAndFocus({ lat: hit.latitude, lng: hit.longitude }, 14);
    onClose();
    if (pathname !== "/") router.push("/");
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center p-4 pt-[max(4.5rem,env(safe-area-inset-top))] sm:items-center sm:pt-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/40"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms var(--as-ease-out)",
        }}
      />
      <div
        className="as-gpu relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible
            ? "translateY(0) scale(1)"
            : "translateY(8px) scale(0.98)",
          transition:
            "opacity 200ms var(--as-ease-out), transform 220ms var(--as-ease-spring)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="sr-only">
          {t("title")}
        </h2>

        <div className="flex items-center gap-2 border-b border-[var(--as-line-soft)] px-3 py-2.5">
          <SearchGlyph className="shrink-0 text-[var(--as-ink-soft)]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setLoading(v.trim().length >= 2);
              runSearch(v);
            }}
            placeholder={t("placeholder")}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[var(--as-ink)] outline-none placeholder:text-[var(--as-muted)]"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label={t("placeholder")}
          />
          <button
            type="button"
            onClick={onClose}
            className="as-press shrink-0 rounded-full px-2 py-1 text-[13px] font-semibold text-[var(--as-ink-soft)] hover:bg-[var(--as-surface-muted)] hover:text-[var(--as-ink)]"
          >
            {t("close")}
          </button>
        </div>

        <div className="max-h-[min(60dvh,22rem)] overflow-y-auto">
          {query.trim().length < 2 && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--as-ink-soft)]">
              {t("hint")}
            </p>
          )}

          {query.trim().length >= 2 && loading && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--as-ink-soft)]">
              {t("searching")}
            </p>
          )}

          {query.trim().length >= 2 && !loading && error && (
            <p className="px-4 py-6 text-center text-[13px] text-[#c13515]">
              {error}
            </p>
          )}

          {query.trim().length >= 2 &&
            !loading &&
            !error &&
            hits.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--as-ink-soft)]">
                {t("empty")}
              </p>
            )}

          {hits.length > 0 && (
            <ul className="py-1">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => pick(hit)}
                    className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left hover:bg-[var(--as-surface-muted)]"
                  >
                    <span className="text-[14px] font-semibold text-[var(--as-ink)]">
                      {hit.name}
                      {(hit.countryCode === "ES" ||
                        hit.countryCode === "DE" ||
                        hit.countryCode === "FR" ||
                        hit.countryCode === "DK" ||
                        hit.countryCode === "CH" ||
                        hit.countryCode === "PT" ||
                        hit.countryCode === "AT" ||
                        hit.countryCode === "SE" ||
                        hit.countryCode === "IE" ||
                        hit.countryCode === "CZ" ||
                        hit.countryCode === "PL") && (
                        <span className="ml-1.5 text-[11px] font-semibold text-[#ff385c]">
                          {hit.countryCode}
                        </span>
                      )}
                    </span>
                    <span className="truncate text-[12px] text-[var(--as-ink-soft)]">
                      {hit.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="border-t border-[var(--as-line-soft)] px-4 py-2 text-[10px] text-[var(--as-muted)]">
          {t("attribution")}
        </p>
      </div>
    </div>
  );
}

function SearchGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="11"
        cy="11"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M16.5 16.5L21 21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
