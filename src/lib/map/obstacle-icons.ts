import type { ObstacleType } from "@canifly/middleware";

export const OBSTACLE_ICON_IDS: Record<ObstacleType, string> = {
  construction: "obstacle-construction-v3",
  crane: "obstacle-crane-v3",
  electric_line: "obstacle-electric-v3",
  air_sports: "obstacle-airsports-v3",
  park: "spot-park-v1",
  rooftop: "spot-rooftop-v1",
  field: "spot-field-v1",
  beach: "spot-beach-v1",
  other: "obstacle-other-v3",
};

/** Prefer fly-spot “other” icon when kind is fly_spot (same type key). */
export const FLY_SPOT_OTHER_ICON_ID = "spot-other-v1";

const COLORS: Record<ObstacleType, string> = {
  construction: "#c13515",
  crane: "#b85c00",
  electric_line: "#5b4db8",
  air_sports: "#007a7a",
  park: "#0d7a4f",
  rooftop: "#0b6e99",
  field: "#3d8b37",
  beach: "#1a8a8a",
  other: "#222222",
};

const SPOT_OTHER_COLOR = "#0d7a4f";

/** Draw path with white halo then colored fill/stroke for map contrast. */
function withHalo(
  ctx: CanvasRenderingContext2D,
  color: string,
  draw: (mode: "halo" | "main") => void,
) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 7;
  draw("halo");
  ctx.restore();

  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.75;
  draw("main");
  ctx.restore();
}

function createObstacleIconImageData(
  type: ObstacleType,
  size = 96,
  colorOverride?: string,
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(size, size);

  const color = colorOverride ?? COLORS[type];
  const s = size / 64;
  ctx.translate(size / 2, size / 2);
  ctx.scale(s, s);

  switch (type) {
    case "construction": {
      withHalo(ctx, color, (mode) => {
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(14, 16);
        ctx.lineTo(-14, 16);
        ctx.closePath();
        if (mode === "halo") {
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(-18, 16);
        ctx.lineTo(18, 16);
        ctx.lineTo(16, 21);
        ctx.lineTo(-16, 21);
        ctx.closePath();
        ctx.fill();
        if (mode === "main") {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(-7, 2);
          ctx.lineTo(7, 2);
          ctx.stroke();
        }
      });
      break;
    }
    case "crane": {
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.moveTo(-2, 22);
        ctx.lineTo(-2, -16);
        ctx.moveTo(-2, -12);
        ctx.lineTo(-16, -12);
        ctx.moveTo(-2, -12);
        ctx.lineTo(22, -12);
        ctx.rect(-6, -12, 8, 7);
        ctx.moveTo(18, -12);
        ctx.lineTo(18, 2);
        ctx.moveTo(15, 2);
        ctx.lineTo(21, 2);
        ctx.moveTo(21, 2);
        ctx.quadraticCurveTo(23, 6, 19, 8);
        ctx.moveTo(-10, 22);
        ctx.lineTo(6, 22);
        ctx.stroke();
        ctx.fillRect(-6, -12, 8, 7);
      });
      break;
    }
    case "electric_line": {
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.moveTo(-12, 22);
        ctx.lineTo(0, 4);
        ctx.lineTo(12, 22);
        ctx.moveTo(-8, 16);
        ctx.lineTo(8, 16);
        ctx.moveTo(-5, 10);
        ctx.lineTo(5, 10);
        ctx.moveTo(0, 4);
        ctx.lineTo(0, -10);
        ctx.moveTo(-16, -6);
        ctx.lineTo(16, -6);
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, -12);
        ctx.moveTo(-14, -6);
        ctx.lineTo(-14, 0);
        ctx.moveTo(14, -6);
        ctx.lineTo(14, 0);
        ctx.moveTo(-10, -12);
        ctx.lineTo(-10, -8);
        ctx.moveTo(10, -12);
        ctx.lineTo(10, -8);
        ctx.moveTo(-4, -12);
        ctx.lineTo(0, -20);
        ctx.lineTo(4, -12);
        ctx.stroke();
      });
      break;
    }
    case "air_sports": {
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(22, 10);
        ctx.lineTo(0, 4);
        ctx.lineTo(-22, 10);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 12, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(0, 10);
        ctx.lineTo(6, 4);
        ctx.stroke();
      });
      break;
    }
    case "park": {
      // Tree
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.arc(0, -6, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-3, 6);
        ctx.lineTo(-3, 20);
        ctx.lineTo(3, 20);
        ctx.lineTo(3, 6);
        ctx.closePath();
        ctx.fill();
      });
      break;
    }
    case "rooftop": {
      // Building / roof
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(18, -4);
        ctx.lineTo(18, 18);
        ctx.lineTo(-18, 18);
        ctx.lineTo(-18, -4);
        ctx.closePath();
        ctx.fill();
        if (ctx.fillStyle) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(-6, 4, 5, 8);
          ctx.fillRect(3, 4, 5, 8);
        }
      });
      break;
    }
    case "field": {
      // Open field / landing pad circle
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(10, 0);
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 10);
        ctx.stroke();
      });
      break;
    }
    case "beach": {
      // Wave
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.moveTo(-18, 4);
        ctx.quadraticCurveTo(-10, -10, 0, 4);
        ctx.quadraticCurveTo(10, 16, 18, 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-18, 12);
        ctx.quadraticCurveTo(-8, 0, 2, 12);
        ctx.quadraticCurveTo(10, 20, 18, 10);
        ctx.stroke();
      });
      break;
    }
    case "other":
    default: {
      withHalo(ctx, color, () => {
        ctx.beginPath();
        ctx.arc(0, -4, 16, Math.PI * 0.85, Math.PI * 0.15, true);
        ctx.lineTo(0, 22);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(colorOverride ? "+" : "?", 0, -5);
      break;
    }
  }

  return ctx.getImageData(0, 0, size, size);
}

export function addObstacleImages(map: {
  hasImage: (id: string) => boolean;
  addImage: (
    id: string,
    image: ImageData,
    options?: { pixelRatio?: number },
  ) => void;
}) {
  (Object.keys(OBSTACLE_ICON_IDS) as ObstacleType[]).forEach((type) => {
    const id = OBSTACLE_ICON_IDS[type];
    if (map.hasImage(id)) return;
    map.addImage(id, createObstacleIconImageData(type), { pixelRatio: 2 });
  });
  if (!map.hasImage(FLY_SPOT_OTHER_ICON_ID)) {
    map.addImage(
      FLY_SPOT_OTHER_ICON_ID,
      createObstacleIconImageData("other", 96, SPOT_OTHER_COLOR),
      { pixelRatio: 2 },
    );
  }
}

/** MapLibre match expression for icon-image from feature type (+ kind for other). */
export function obstacleIconImageExpression(): unknown[] {
  return [
    "case",
    [
      "all",
      ["==", ["get", "kind"], "fly_spot"],
      ["==", ["get", "type"], "other"],
    ],
    FLY_SPOT_OTHER_ICON_ID,
    [
      "match",
      ["get", "type"],
      "construction",
      OBSTACLE_ICON_IDS.construction,
      "crane",
      OBSTACLE_ICON_IDS.crane,
      "electric_line",
      OBSTACLE_ICON_IDS.electric_line,
      "air_sports",
      OBSTACLE_ICON_IDS.air_sports,
      "park",
      OBSTACLE_ICON_IDS.park,
      "rooftop",
      OBSTACLE_ICON_IDS.rooftop,
      "field",
      OBSTACLE_ICON_IDS.field,
      "beach",
      OBSTACLE_ICON_IDS.beach,
      "other",
      OBSTACLE_ICON_IDS.other,
      OBSTACLE_ICON_IDS.other,
    ],
  ];
}
