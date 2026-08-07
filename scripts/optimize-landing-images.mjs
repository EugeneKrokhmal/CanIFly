#!/usr/bin/env node
/**
 * Compress sources in /landing → optimized assets in /public/landing.
 *
 * Drop originals into CanIFly/landing/ (kept out of git), then:
 *   npm run optimize:landing
 *
 * Requires: sharp (devDep), ffmpeg on PATH for videos.
 * Scrub hero also needs libsvtav1 + libx265 for AV1/HEVC variants.
 */
import { spawnSync } from "child_process";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "landing");
const outDir = path.join(root, "public", "landing");

const imageJobs = [
  { file: "DJI_0021.JPG", name: "hero", widths: [640, 1280, 1920], quality: 78 },
  { file: "DJI_0049.JPG", name: "spot-coast", widths: [640, 1200], quality: 76 },
  { file: "DJI_0054.JPG", name: "spot-ridge", widths: [640, 1200], quality: 76 },
  { file: "DJI_0082.JPG", name: "spot-valley", widths: [640, 1200], quality: 76 },
];

const videoJobs = [
  // Swipe-scrub hero: 1080p / 20fps, multi-codec (AV1 → HEVC → H.264).
  {
    file: "landing-bg.mov",
    name: "clip-coast",
    width: 1920,
    fps: 20,
    scrub: true,
    codecs: {
      av1: { crf: 30, preset: "6" },
      hevc: { crf: 28, preset: "medium" },
      h264: { crf: 23, preset: "slow" },
    },
  },
  // Normal loop/card clip — long GOP, much smaller.
  {
    file: "DJI_0061.MP4",
    name: "clip-ridge",
    width: 1280,
    fps: 30,
    crf: 26,
    scrub: false,
  },
];

fs.mkdirSync(outDir, { recursive: true });

function runFfmpeg(args) {
  const r = spawnSync("ffmpeg", ["-y", ...args], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr?.slice(-800) || "ffmpeg failed");
    process.exit(1);
  }
}

function logSize(label, filePath) {
  console.log(
    `${label}  ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(1)}MB`,
  );
}

let imageMissing = 0;
for (const job of imageJobs) {
  const input = path.join(srcDir, job.file);
  if (!fs.existsSync(input)) {
    console.warn("skip missing image:", job.file);
    imageMissing += 1;
    continue;
  }
  const base = sharp(input).rotate();
  for (const w of job.widths) {
    const webpOut = path.join(outDir, `${job.name}-${w}.webp`);
    const jpgOut = path.join(outDir, `${job.name}-${w}.jpg`);
    await base
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: job.quality, effort: 6 })
      .toFile(webpOut);
    await base
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .jpeg({ quality: job.quality + 2, mozjpeg: true })
      .toFile(jpgOut);
    console.log(
      `${job.name}-${w}.webp  ${(fs.statSync(webpOut).size / 1024).toFixed(0)}KB`,
    );
  }
  await base
    .clone()
    .resize(24)
    .webp({ quality: 40 })
    .toFile(path.join(outDir, `${job.name}-blur.webp`));
}

for (const job of videoJobs) {
  const input = path.join(srcDir, job.file);
  if (!fs.existsSync(input)) {
    console.warn("skip missing video:", job.file);
    continue;
  }

  const vf = `scale=${job.width}:-2,fps=${job.fps}`;
  // ~1s keyframes at scrub fps — seeks stay usable, size stays sane.
  const g = String(Math.max(1, Math.round(job.fps)));

  if (job.scrub && job.codecs) {
    const av1Out = path.join(outDir, `${job.name}.av1.mp4`);
    const hevcOut = path.join(outDir, `${job.name}.hevc.mp4`);
    const h264Out = path.join(outDir, `${job.name}.mp4`);

    runFfmpeg([
      "-i",
      input,
      "-an",
      "-vf",
      vf,
      "-c:v",
      "libsvtav1",
      "-pix_fmt",
      "yuv420p",
      "-crf",
      String(job.codecs.av1.crf),
      "-preset",
      String(job.codecs.av1.preset),
      "-g",
      g,
      "-keyint_min",
      g,
      "-svtav1-params",
      `keyint=${g}:scd=0:lp=4`,
      "-movflags",
      "+faststart",
      av1Out,
    ]);
    logSize(`${job.name}.av1.mp4`, av1Out);

    runFfmpeg([
      "-i",
      input,
      "-an",
      "-vf",
      vf,
      "-c:v",
      "libx265",
      "-pix_fmt",
      "yuv420p",
      "-tag:v",
      "hvc1",
      "-preset",
      String(job.codecs.hevc.preset),
      "-crf",
      String(job.codecs.hevc.crf),
      "-g",
      g,
      "-keyint_min",
      g,
      "-bf",
      "0",
      "-x265-params",
      `keyint=${g}:min-keyint=${g}:scenecut=0:bframes=0`,
      "-movflags",
      "+faststart",
      hevcOut,
    ]);
    logSize(`${job.name}.hevc.mp4`, hevcOut);

    runFfmpeg([
      "-i",
      input,
      "-an",
      "-vf",
      vf,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "high",
      "-preset",
      String(job.codecs.h264.preset),
      "-crf",
      String(job.codecs.h264.crf),
      "-g",
      g,
      "-keyint_min",
      g,
      "-bf",
      "0",
      "-sc_threshold",
      "0",
      "-movflags",
      "+faststart",
      h264Out,
    ]);
    logSize(`${job.name}.mp4`, h264Out);

    const posterJpg = path.join(outDir, `${job.name}-poster.jpg`);
    const posterWebp = path.join(outDir, `${job.name}-poster.webp`);
    // Poster from the original master — sharper than a frame of the scrub encode.
    const posterPng = path.join(outDir, `${job.name}-poster.png`);
    runFfmpeg([
      "-ss",
      "0",
      "-i",
      input,
      "-frames:v",
      "1",
      "-update",
      "1",
      posterPng,
    ]);
    await sharp(posterPng)
      .rotate()
      .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(posterJpg);
    await sharp(posterPng)
      .rotate()
      .webp({ quality: 92, effort: 6 })
      .toFile(posterWebp);
    await sharp(posterPng)
      .rotate()
      .resize(24)
      .webp({ quality: 40 })
      .toFile(path.join(outDir, `${job.name}-blur.webp`));
    continue;
  }

  const mp4Out = path.join(outDir, `${job.name}.mp4`);
  const posterJpg = path.join(outDir, `${job.name}-poster.jpg`);
  const posterWebp = path.join(outDir, `${job.name}-poster.webp`);

  runFfmpeg([
    "-i",
    input,
    "-an",
    "-vf",
    vf,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-preset",
    "medium",
    "-crf",
    String(job.crf),
    "-movflags",
    "+faststart",
    mp4Out,
  ]);
  runFfmpeg([
    "-ss",
    "0",
    "-i",
    mp4Out,
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "2",
    posterJpg,
  ]);
  await sharp(posterJpg).webp({ quality: 72 }).toFile(posterWebp);
  await sharp(posterJpg)
    .resize(24)
    .webp({ quality: 40 })
    .toFile(path.join(outDir, `${job.name}-blur.webp`));
  logSize(`${job.name}.mp4`, mp4Out);
}

if (imageMissing === imageJobs.length) {
  console.warn("No source images found — videos may still have been processed.");
}
console.log("Wrote", outDir);
