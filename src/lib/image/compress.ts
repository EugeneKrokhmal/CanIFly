/** Client-side image compression before upload (canvas). */

export type CompressImageOptions = {
  /** Longest edge in CSS pixels (default 1600). */
  maxEdge?: number;
  /** JPEG quality 0–1 (default 0.82). */
  quality?: number;
  /** Output MIME (default image/jpeg). */
  mimeType?: "image/jpeg" | "image/webp";
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Compression produced empty blob"));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Downscale + recompress a picked photo. Falls back to the original file
 * if compression fails or wouldn’t shrink it.
 */
export async function compressImageFile(
  file: File,
  opts: CompressImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.82;
  const mimeType = opts.mimeType ?? "image/jpeg";

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(img, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, mimeType, quality);

    // Keep original if somehow larger (e.g. tiny optimized PNG).
    if (blob.size >= file.size && scale === 1) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    const ext = mimeType === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${base}.${ext}`, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
