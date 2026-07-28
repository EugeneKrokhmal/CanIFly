import type { ObstacleType } from "@canifly/middleware";

export const OBSTACLE_ICON_IDS: Record<ObstacleType, string> = {
  construction: "obstacle-construction-v3",
  crane: "obstacle-crane-v3",
  electric_line: "obstacle-electric-v3",
  air_sports: "obstacle-airsports-v3",
  other: "obstacle-other-v3",
};

const COLORS: Record<ObstacleType, string> = {
  construction: "#c13515",
  crane: "#b85c00",
  electric_line: "#5b4db8",
  air_sports: "#007a7a",
  other: "#222222",
};

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
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(size, size);

  const color = COLORS[type];
  const s = size / 64;
  ctx.translate(size / 2, size / 2);
  ctx.scale(s, s);

  switch (type) {
    case "construction": {
      // Traffic cone — universal “works / construction” symbol
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
        // Base
        ctx.beginPath();
        ctx.moveTo(-18, 16);
        ctx.lineTo(18, 16);
        ctx.lineTo(16, 21);
        ctx.lineTo(-16, 21);
        ctx.closePath();
        ctx.fill();
        if (mode === "main") {
          // Stripe
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
      // Side-view tower crane
      withHalo(ctx, color, (mode) => {
        const strokeOnly = () => {
          ctx.beginPath();
          // Mast
          ctx.moveTo(-2, 22);
          ctx.lineTo(-2, -16);
          // Counter-jib
          ctx.moveTo(-2, -12);
          ctx.lineTo(-16, -12);
          // Main jib
          ctx.moveTo(-2, -12);
          ctx.lineTo(22, -12);
          // Cab
          ctx.rect(-6, -12, 8, 7);
          // Hook cable + hook
          ctx.moveTo(18, -12);
          ctx.lineTo(18, 2);
          ctx.moveTo(15, 2);
          ctx.lineTo(21, 2);
          ctx.moveTo(21, 2);
          ctx.quadraticCurveTo(23, 6, 19, 8);
          // Base feet
          ctx.moveTo(-10, 22);
          ctx.lineTo(6, 22);
        };
        if (mode === "halo") {
          strokeOnly();
          ctx.stroke();
          ctx.fillRect(-6, -12, 8, 7);
        } else {
          strokeOnly();
          ctx.stroke();
          ctx.fillRect(-6, -12, 8, 7);
        }
      });
      break;
    }
    case "electric_line": {
      // High-voltage transmission tower
      withHalo(ctx, color, (mode) => {
        ctx.beginPath();
        // Legs
        ctx.moveTo(-12, 22);
        ctx.lineTo(0, 4);
        ctx.lineTo(12, 22);
        // Cross braces
        ctx.moveTo(-8, 16);
        ctx.lineTo(8, 16);
        ctx.moveTo(-5, 10);
        ctx.lineTo(5, 10);
        // Upper mast
        ctx.moveTo(0, 4);
        ctx.lineTo(0, -10);
        // Cross-arms
        ctx.moveTo(-16, -6);
        ctx.lineTo(16, -6);
        ctx.moveTo(-12, -12);
        ctx.lineTo(12, -12);
        // Insulators / wires hanging
        ctx.moveTo(-14, -6);
        ctx.lineTo(-14, 0);
        ctx.moveTo(14, -6);
        ctx.lineTo(14, 0);
        ctx.moveTo(-10, -12);
        ctx.lineTo(-10, -8);
        ctx.moveTo(10, -12);
        ctx.lineTo(10, -8);
        // Peak
        ctx.moveTo(-4, -12);
        ctx.lineTo(0, -20);
        ctx.lineTo(4, -12);
        if (mode === "halo") {
          ctx.stroke();
        } else {
          ctx.stroke();
        }
      });
      break;
    }
    case "air_sports": {
      // Hang glider — distinctive delta wing
      withHalo(ctx, color, (mode) => {
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(22, 10);
        ctx.lineTo(0, 4);
        ctx.lineTo(-22, 10);
        ctx.closePath();
        if (mode === "halo") {
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fill();
        }
        // Pilot
        ctx.beginPath();
        ctx.arc(0, 12, 4.5, 0, Math.PI * 2);
        ctx.fill();
        // Harness lines
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(0, 10);
        ctx.lineTo(6, 4);
        ctx.stroke();
      });
      break;
    }
    case "other":
    default: {
      // Rounded pin with ?
      withHalo(ctx, color, (mode) => {
        ctx.beginPath();
        ctx.arc(0, -4, 16, Math.PI * 0.85, Math.PI * 0.15, true);
        ctx.lineTo(0, 22);
        ctx.closePath();
        if (mode === "halo") {
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fill();
        }
      });
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", 0, -5);
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
}
