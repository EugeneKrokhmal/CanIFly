"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  obstacleLabel,
  type ObstacleType,
} from "@canifly/middleware";
import { useObstaclesStore } from "@/stores/obstacles";
import { useAuthStore } from "@/stores/auth";
import { compressImageFile } from "@/lib/image/compress";

const TYPES: ObstacleType[] = [
  "construction",
  "crane",
  "electric_line",
  "air_sports",
  "other",
];

export function ReportObstaclePanel() {
  const t = useTranslations("obstacle");
  const locale = useLocale() as "es" | "en";
  const user = useAuthStore((s) => s.user);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const placementMode = useObstaclesStore((s) => s.placementMode);
  const draft = useObstaclesStore((s) => s.draft);
  const photoPreview = useObstaclesStore((s) => s.photoPreview);
  const pendingPoint = useObstaclesStore((s) => s.pendingPoint);
  const submitting = useObstaclesStore((s) => s.submitting);
  const error = useObstaclesStore((s) => s.error);
  const setDraft = useObstaclesStore((s) => s.setDraft);
  const setPhoto = useObstaclesStore((s) => s.setPhoto);
  const startPlacement = useObstaclesStore((s) => s.startPlacement);
  const cancelPlacement = useObstaclesStore((s) => s.cancelPlacement);
  const submitObstacle = useObstaclesStore((s) => s.submitObstacle);

  const begin = () => {
    if (!user) {
      setAuthModalOpen(true, "login");
      return;
    }
    startPlacement();
  };

  return (
    <section className="mt-8">
      <h2 className="text-[12px] font-semibold text-[#222222]">
        {t("reportTitle")}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-[#717171]">
        {t("reportHint")}
      </p>

      {!placementMode ? (
        <button
          type="button"
          onClick={begin}
          className="as-press mt-3 w-full rounded-xl border border-[#dddddd] bg-white px-3 py-2.5 text-[14px] font-semibold text-[#222222] hover:bg-[#f7f7f7]"
        >
          {user ? t("addOnMap") : t("logInToReport")}
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-2xl border border-[#ebebeb] bg-[#f7f7f7] p-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-[#222222]">
              {t("type")}
            </span>
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ type: e.target.value as ObstacleType })
              }
              className="w-full rounded-xl border border-[#dddddd] bg-white px-3 py-2 text-[14px]"
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {obstacleLabel(type, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[12px] font-semibold text-[#222222]">
                {t("approxHeight")}
              </span>
              <span className="text-[14px] font-bold text-[#222222]">
                {draft.heightM}
                <span className="ml-1 text-[11px] font-medium text-[#717171]">
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
            <span className="mb-1.5 block text-[12px] font-semibold text-[#222222]">
              {t("message")}{" "}
              <span className="font-normal text-[#717171]">{t("optional")}</span>
            </span>
            <textarea
              value={draft.message}
              onChange={(e) => setDraft({ message: e.target.value })}
              rows={2}
              maxLength={500}
              placeholder={t("messagePlaceholder")}
              className="w-full resize-none rounded-xl border border-[#dddddd] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#222222]"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-[#222222]">
              {t("photo")}{" "}
              <span className="font-normal text-[#717171]">{t("optional")}</span>
            </span>
            {photoPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-[#dddddd] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt={t("photoPreviewAlt")}
                  className="h-28 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-[#222222] shadow"
                >
                  {t("remove")}
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#dddddd] bg-white px-3 py-5 text-center hover:bg-[#fafafa]">
                <span className="text-[13px] font-semibold text-[#222222]">
                  {t("addPhoto")}
                </span>
                <span className="mt-1 text-[11px] text-[#717171]">
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

          <p className="text-[13px] text-[#717171]">
            {pendingPoint
              ? t("pinnedAt", {
                  lat: pendingPoint.lat.toFixed(5),
                  lng: pendingPoint.lng.toFixed(5),
                })
              : t("tapToPlace")}
          </p>

          {error && (
            <p className="rounded-xl bg-[#fff8f6] px-3 py-2 text-[13px] text-[#c13515]">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={cancelPlacement}
              className="as-press flex-1 rounded-xl border border-[#dddddd] bg-white px-3 py-2 text-[13px] font-semibold text-[#222222]"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              disabled={!pendingPoint || submitting}
              onClick={() => void submitObstacle()}
              className="as-press flex-1 rounded-xl bg-[#222222] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {submitting ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
