"use client";

import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { epaulettePlateSvg } from "@/lib/map/rank-epaulette-svg";

type Props = {
  Icon: LucideIcon;
  earned: boolean;
  /** Alternate metal tone for visual variety across badges. */
  metal?: "gold" | "silver";
  className?: string;
  title?: string;
};

/**
 * Achievement mark — shared epaulette plate with Lucide icon.
 */
export function AchievementEpaulette({
  Icon,
  earned,
  metal = "gold",
  className,
  title,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const svg = epaulettePlateSvg({
    uid,
    metal,
    earned,
    fieldWash: true,
  });

  return (
    <div
      className={[
        "as-achv",
        earned ? "as-achv--earned" : "as-achv--locked",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={title}
    >
      <span
        className="as-achv__plate-svg"
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="as-achv__icon-wrap">
        <Icon className="as-achv__icon" strokeWidth={1.85} />
      </div>
    </div>
  );
}
