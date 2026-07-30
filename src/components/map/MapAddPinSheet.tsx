"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import {
  obstacleLabel,
  pinKindLabel,
  typesForPinKind,
  type ObstacleType,
  type PinKind,
} from "@canifly/middleware";
import { useAuthStore } from "@/stores/auth";
import { useObstaclesStore } from "@/stores/obstacles";
import { compressImageFile } from "@/lib/image/compress";

export function MapAddPinFab() {
  const t = useTranslations("pin");
  const user = useAuthStore((s) => s.user);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const placementMode = useObstaclesStore((s) => s.placementMode);
  const startPlacement = useObstaclesStore((s) => s.startPlacement);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (placementMode) setMenuOpen(false);
  }, [placementMode]);

  const begin = (kind: PinKind) => {
    if (!user) {
      setAuthModalOpen(true, "login");
      setMenuOpen(false);
      return;
    }
    startPlacement(kind);
    setMenuOpen(false);
  };

  if (placementMode) return null;

  return (
    <div className="pointer-events-auto relative flex flex-col items-start gap-2.5">
      {menuOpen ? (
        <div className="as-sheet-in w-[min(100vw-2rem,15.5rem)] overflow-hidden rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] shadow-[0_8px_28px_rgba(0,0,0,0.16)] [transform-origin:bottom_left]">
          <p className="border-b border-[var(--as-line-soft)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--as-ink-soft)]">
            {t("addMenuHint")}
          </p>
          <button
            type="button"
            onClick={() => begin("obstacle")}
            className="as-press flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-[var(--as-hover-warm)]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[18px] font-bold text-white"
              style={{ background: "#c13515" }}
              aria-hidden
            >
              !
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-[var(--as-ink)]">
                {t("addObstacle")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[var(--as-ink-soft)]">
                {t("addObstacleHint")}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => begin("fly_spot")}
            className="as-press flex w-full items-center gap-3 border-t border-[var(--as-line-soft)] px-3.5 py-3 text-left hover:bg-[var(--as-hover-green)]"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-bold text-white"
              style={{ background: "#0d7a4f" }}
              aria-hidden
            >
              +
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-[var(--as-ink)]">
                {t("addFlySpot")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-[var(--as-ink-soft)]">
                {t("addFlySpotHint")}
              </span>
            </span>
          </button>
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          aria-label={t("addAria")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="as-press relative flex h-12 items-center gap-2 rounded-full border-2 border-white bg-[var(--as-rausch)] pl-3.5 pr-4 text-white shadow-[0_4px_16px_rgba(255,56,92,0.45),0_2px_6px_rgba(0,0,0,0.18)] hover:bg-[var(--as-rausch-hover)]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-[22px] font-light leading-none">
            {menuOpen ? "×" : "+"}
          </span>
          <span className="text-[14px] font-semibold tracking-tight">
            {menuOpen ? t("closeMenu") : t("add")}
          </span>
        </button>
      </div>
    </div>
  );
}

export function MapAddPinSheet() {
  const t = useTranslations("pin");
  const locale = useLocale() as AppLocale;
  const kind = useObstaclesStore((s) => s.kind);
  const placementMode = useObstaclesStore((s) => s.placementMode);
  const draft = useObstaclesStore((s) => s.draft);
  const photoPreview = useObstaclesStore((s) => s.photoPreview);
  const pendingPoint = useObstaclesStore((s) => s.pendingPoint);
  const submitting = useObstaclesStore((s) => s.submitting);
  const error = useObstaclesStore((s) => s.error);
  const setDraft = useObstaclesStore((s) => s.setDraft);
  const setPhoto = useObstaclesStore((s) => s.setPhoto);
  const cancelPlacement = useObstaclesStore((s) => s.cancelPlacement);
  const submitObstacle = useObstaclesStore((s) => s.submitObstacle);

  if (!placementMode) return null;

  const types = typesForPinKind(kind);
  const heightLabel =
    kind === "fly_spot" ? t("suggestedCeiling") : t("approxHeight");

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-[60] max-h-[min(92dvh,100%)] sm:inset-x-auto sm:bottom-3 sm:left-3 sm:w-[min(100%-1.5rem,20.5rem)]">
      <div className="as-sheet-in as-scroll flex max-h-[min(92dvh,100%)] flex-col overflow-y-auto rounded-t-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(0,0,0,0.12)] sm:max-h-[min(85dvh,40rem)] sm:rounded-2xl sm:p-4 sm:pb-4 sm:shadow-[0_8px_28px_rgba(0,0,0,0.14)]">
        <div className="mb-2.5 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--as-ink-soft)]">
              {pinKindLabel(kind, locale)}
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[var(--as-ink)]">
              {kind === "fly_spot" ? t("sheetTitleFlySpot") : t("sheetTitleObstacle")}
            </h2>
          </div>
          <button
            type="button"
            onClick={cancelPlacement}
            className="rounded-full px-2 py-1 text-[18px] leading-none text-[var(--as-ink-soft)] hover:bg-[var(--as-surface-muted)]"
            aria-label={t("cancel")}
          >
            ×
          </button>
        </div>

        <div className="space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--as-ink)]">
              {t("type")}
            </span>
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ type: e.target.value as ObstacleType })
              }
              className="w-full rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2 text-[14px]"
            >
              {types.map((type) => (
                <option key={type} value={type}>
                  {obstacleLabel(type, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-[var(--as-ink)]">
                {heightLabel}
              </span>
              <span className="text-[14px] font-bold text-[var(--as-ink)]">
                {draft.heightM}
                <span className="ml-1 text-[11px] font-medium text-[var(--as-ink-soft)]">
                  m
                </span>
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={300}
              step={5}
              value={draft.heightM}
              onChange={(e) => setDraft({ heightM: Number(e.target.value) })}
              className="w-full accent-[#ff385c]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[12px] font-semibold text-[var(--as-ink)]">
              {t("message")}{" "}
              <span className="font-normal text-[var(--as-ink-soft)]">{t("optional")}</span>
            </span>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft({ message: e.target.value })}
              rows={1}
              maxLength={500}
              placeholder={
                kind === "fly_spot"
                  ? t("messagePlaceholderFlySpot")
                  : t("messagePlaceholderObstacle")
              }
              className="w-full resize-none rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2 text-[14px] outline-none focus:border-[var(--as-ink)]"
            />
          </label>

          <div>
            <span className="mb-1 block text-[12px] font-semibold text-[var(--as-ink)]">
              {t("photo")}{" "}
              <span className="font-normal text-[var(--as-ink-soft)]">{t("optional")}</span>
            </span>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt=""
                  className="h-16 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-[var(--as-ink)] shadow"
                >
                  {t("remove")}
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--as-line)] bg-[var(--as-surface-muted)] px-3 py-2.5 text-center hover:bg-[var(--as-hover)]">
                <span className="text-[13px] font-semibold text-[var(--as-ink)]">
                  {t("addPhoto")}
                </span>
                <span className="text-[11px] text-[var(--as-ink-soft)]">
                  {t("photoFormats")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      useObstaclesStore.setState({
                        error: t("photoFormats"),
                      });
                      return;
                    }
                    if (file.size > 12 * 1024 * 1024) {
                      useObstaclesStore.setState({
                        error: t("photoTooLarge"),
                      });
                      return;
                    }
                    void (async () => {
                      const compressed = await compressImageFile(file, {
                        maxEdge: 1600,
                        quality: 0.82,
                      });
                      if (compressed.size > 5 * 1024 * 1024) {
                        useObstaclesStore.setState({
                          error: t("photoTooLarge"),
                        });
                        return;
                      }
                      useObstaclesStore.setState({ error: null });
                      setPhoto(compressed);
                    })();
                  }}
                />
              </label>
            )}
          </div>

          <p className="text-[12px] text-[var(--as-ink-soft)]">
            {pendingPoint
              ? t("pinnedAt", {
                  lat: pendingPoint.lat.toFixed(5),
                  lng: pendingPoint.lng.toFixed(5),
                })
              : t("tapToPlace")}
          </p>

          {error ? (
            <p className="rounded-xl bg-[var(--as-hover-warm)] px-3 py-2 text-[13px] text-[var(--as-prohibited)]">
              {error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelPlacement}
              className="as-press flex-1 rounded-xl border border-[var(--as-line)] bg-[var(--as-surface)] px-3 py-2.5 text-[13px] font-semibold text-[var(--as-ink)]"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={!pendingPoint || submitting}
              onClick={() => void submitObstacle()}
              className="as-press flex-1 rounded-xl bg-[var(--as-ink)] px-3 py-2.5 text-[13px] font-semibold text-[var(--as-ink-invert)] disabled:opacity-50"
            >
              {submitting ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
