"use client";

import { useId } from "react";
import type { RankInsignia } from "@/lib/pilot-rank";
import { rankEpauletteSvg } from "@/lib/map/rank-epaulette-svg";

type Props = {
  insignia: RankInsignia;
  className?: string;
  title?: string;
};

/**
 * Aviation epaulette mark — shared SVG geometry with map popups.
 */
export function PilotRankInsignia({ insignia, className, title }: Props) {
  const uid = useId().replace(/:/g, "");
  const svg = rankEpauletteSvg(insignia, { uid, className });
  return (
    <span
      className="contents"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
