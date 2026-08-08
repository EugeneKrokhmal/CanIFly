"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BackToMapLink } from "@/components/layout/BackToMapLink";

type Platform = "ios" | "android";

type Shot = {
  src: string;
  alt: string;
  caption: string;
};

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--as-rausch-soft)] text-[12px] font-bold text-[var(--as-rausch)]">
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-[var(--as-ink)]">{title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
          {body}
        </p>
      </div>
    </li>
  );
}

function ShotGallery({ shots }: { shots: Shot[] }) {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {shots.map((shot) => (
        <figure
          key={shot.src + shot.caption}
          className="overflow-hidden rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] shadow-[var(--as-shadow)]"
        >
          <div className="relative aspect-[9/16] w-full bg-[var(--as-surface-muted)]">
            <Image
              src={shot.src}
              alt={shot.alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 100vw, 220px"
            />
          </div>
          <figcaption className="px-3 py-2.5 text-[12px] leading-snug text-[var(--as-ink-soft)]">
            {shot.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function GuideFlightsContent() {
  const t = useTranslations("guideFlights");
  const [platform, setPlatform] = useState<Platform>("ios");

  const iosShots: Shot[] = [
    {
      src: "/guide/flights/ios-01-on-my-iphone.png",
      alt: t("shotIosBrowse"),
      caption: t("ios.s1Caption"),
    },
    {
      src: "/guide/flights/ios-02-flightrecords.png",
      alt: t("shotIosRecords"),
      caption: t("ios.s2Caption"),
    },
    {
      src: "/guide/flights/canifly-upload.png",
      alt: t("shotUpload"),
      caption: t("upload.caption"),
    },
  ];

  const androidShots: Shot[] = [
    {
      src: "/guide/flights/android-01-dji-folder.png",
      alt: t("shotAndroidBrowse"),
      caption: t("android.s1Caption"),
    },
    {
      src: "/guide/flights/android-02-flightrecords.png",
      alt: t("shotAndroidRecords"),
      caption: t("android.s2Caption"),
    },
    {
      src: "/guide/flights/canifly-upload.png",
      alt: t("shotUpload"),
      caption: t("upload.caption"),
    },
  ];

  return (
    <>
      <p className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
        {t("eyebrow")}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold tracking-tight text-[var(--as-ink)] sm:text-[32px]">
        {t("title")}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--as-ink-soft)]">
        {t("intro")}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/account"
          className="as-press inline-flex rounded-full bg-[var(--as-ink)] px-4 py-2 text-[13px] font-semibold text-[var(--as-ink-invert)]"
        >
          {t("ctaAccount")}
        </Link>
        <Link
          href="/guide"
          className="as-press inline-flex rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] px-4 py-2 text-[13px] font-semibold text-[var(--as-ink)]"
        >
          {t("ctaGuide")}
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--as-ink-soft)]">
          {t("whatYouNeedTitle")}
        </h2>
        <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-[var(--as-ink)]">
          <li>· {t("need1")}</li>
          <li>· {t("need2")}</li>
          <li>· {t("need3")}</li>
        </ul>
      </section>

      <div
        className="mt-8 inline-flex rounded-full border border-[var(--as-line)] bg-[var(--as-surface)] p-1 shadow-[var(--as-shadow)]"
        role="tablist"
        aria-label={t("platformAria")}
      >
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={platform === p}
            onClick={() => setPlatform(p)}
            className={[
              "as-press rounded-full px-4 py-1.5 text-[13px] font-semibold transition",
              platform === p
                ? "bg-[var(--as-ink)] text-[var(--as-ink-invert)]"
                : "text-[var(--as-ink-soft)] hover:text-[var(--as-ink)]",
            ].join(" ")}
          >
            {p === "ios" ? t("tabIos") : t("tabAndroid")}
          </button>
        ))}
      </div>

      {platform === "ios" ? (
        <section className="mt-6" aria-labelledby="ios-heading">
          <h2
            id="ios-heading"
            className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-tight"
          >
            {t("ios.title")}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
            {t("ios.note")}
          </p>
          <ol className="mt-5 space-y-4">
            <Step n={1} title={t("ios.s1Title")} body={t("ios.s1Body")} />
            <Step n={2} title={t("ios.s2Title")} body={t("ios.s2Body")} />
            <Step n={3} title={t("ios.s3Title")} body={t("ios.s3Body")} />
            <Step n={4} title={t("ios.s4Title")} body={t("ios.s4Body")} />
          </ol>
          <ShotGallery shots={iosShots} />
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="android-heading">
          <h2
            id="android-heading"
            className="font-[family-name:var(--font-display)] text-[22px] font-bold tracking-tight"
          >
            {t("android.title")}
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
            {t("android.note")}
          </p>
          <ol className="mt-5 space-y-4">
            <Step n={1} title={t("android.s1Title")} body={t("android.s1Body")} />
            <Step n={2} title={t("android.s2Title")} body={t("android.s2Body")} />
            <Step n={3} title={t("android.s3Title")} body={t("android.s3Body")} />
            <Step n={4} title={t("android.s4Title")} body={t("android.s4Body")} />
          </ol>
          <ShotGallery shots={androidShots} />
        </section>
      )}

      <section className="mt-10 rounded-2xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] p-5 shadow-[var(--as-shadow)]">
        <h2 className="text-[16px] font-semibold tracking-tight">
          {t("upload.title")}
        </h2>
        <ol className="mt-4 space-y-4">
          <Step n={1} title={t("upload.s1Title")} body={t("upload.s1Body")} />
          <Step n={2} title={t("upload.s2Title")} body={t("upload.s2Body")} />
          <Step n={3} title={t("upload.s3Title")} body={t("upload.s3Body")} />
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--as-ink-soft)]">
          {t("tipsTitle")}
        </h2>
        <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-[var(--as-ink-soft)]">
          <li>· {t("tip1")}</li>
          <li>· {t("tip2")}</li>
          <li>· {t("tip3")}</li>
          <li>· {t("tip4")}</li>
        </ul>
      </section>

      <BackToMapLink namespace="guideFlights" />
    </>
  );
}
