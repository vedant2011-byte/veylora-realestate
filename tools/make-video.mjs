/**
 * make-video.mjs — build-time pipeline: frame sequences -> ONE cinematic MP4.
 *
 * Concatenates the 809 frames (film order from src/data/frame-manifest.json)
 * into a single H.264 MP4 in two variants:
 *   desktop: 1080x1920 @30fps, CRF 21
 *   mobile:   540x960  @30fps, CRF 27
 * plus a poster JPEG from the exact first frame.
 *
 * Usage: node tools/make-video.mjs
 * Requires ffmpeg (env FFMPEG overrides the binary path).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "src/data/frame-manifest.json"), "utf8"));
const OUT_DIR = join(ROOT, "public", "video");
const FPS = 30;
const CRF_DESKTOP = 23;
const CRF_MOBILE = 27;
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const local = join(ROOT, "tools", "ffmpeg.exe");
  if (existsSync(local)) return local;
  try {
    return execFileSync("where", ["ffmpeg"], { encoding: "utf8" }).split(/\r?\n/)[0].trim();
  } catch {
    // winget default install location
    const candidates = [
      process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Microsoft/WinGet/Packages"),
    ].filter(Boolean);
    for (const dir of candidates) {
      try {
        for (const pkg of readdirSync(dir)) {
          if (!pkg.startsWith("Gyan.FFmpeg")) continue;
          for (const build of readdirSync(join(dir, pkg))) {
            const bin = join(dir, pkg, build, "bin", "ffmpeg.exe");
            if (existsSync(bin)) return bin;
          }
        }
      } catch {}
    }
    throw new Error("ffmpeg not found. Install it or set FFMPEG env var.");
  }
}

const ffmpeg = findFfmpeg();
console.log("ffmpeg:", ffmpeg);

// 1. Build concat list in exact film order from the manifest.
mkdirSync(OUT_DIR, { recursive: true });
const concatPath = join(ROOT, "tools", "frames-concat.txt");
const lines = ["ffconcat version 1.0"];
for (const f of MANIFEST.frames) {
  const p = join(ROOT, "public", f.src.replace(/^\//, "")).replace(/\\/g, "/").replace(/'/g, "'\\''");
  lines.push(`file '${p}'`);
  lines.push("duration 0.033333333");
}
// ffconcat quirk: repeat last file so its duration is honored.
lines.push(`file '${join(ROOT, "public", MANIFEST.frames.at(-1).src.replace(/^\//, "")).replace(/\\/g, "/")}'`);
writeFileSync(concatPath, lines.join("\n"), "utf8");
console.log(`concat list: ${MANIFEST.frames.length} frames @ ${FPS}fps = ${(MANIFEST.frames.length / FPS).toFixed(2)}s`);

// 2. Common encode args: yuv420p, faststart, no audio, 30fps.
function encode(outName, scale, crf, maxrate) {
  const out = join(OUT_DIR, outName);
  const args = [
    "-y",
    "-f", "concat", "-safe", "0", "-i", concatPath,
    "-vf", `fps=${FPS},scale=${scale}:force_original_aspect_ratio=decrease,setsar=1,format=yuv420p`,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", String(crf),
    "-maxrate", maxrate,
    "-bufsize", "16M",
    "-profile:v", "high",
    "-level", "4.0",
    "-g", "60", "-keyint_min", "60", "-sc_threshold", "0",
    "-movflags", "+faststart",
    "-an",
    out,
  ];
  console.log(`encoding ${outName} (${scale}, CRF ${crf})...`);
  execFileSync(ffmpeg, args, { stdio: ["ignore", "ignore", "inherit"] });
  console.log(`  -> ${out}`);
  return out;
}

const desktop = only === "mobile" ? null : encode("hero-cinematic-desktop.mp4", "1080:1920", CRF_DESKTOP, "7M");
const mobile = only === "desktop" ? null : encode("hero-cinematic-mobile.mp4", "540:960", CRF_MOBILE, "2.5M");

// 3. Poster from the exact first frame (vision-0001), 720x1280 -> 1080x1920 poster.
const poster = join(OUT_DIR, "hero-cinematic-poster.jpg");
if (only !== "mobile") {
  execFileSync(ffmpeg, [
    "-y",
    "-i", join(ROOT, "public", "frames", "vision", "vision-0001.jpg"),
    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease",
    "-q:v", "3",
    "-frames:v", "1",
    "-update", "1",
    poster,
  ], { stdio: ["ignore", "ignore", "inherit"] });
  console.log(`poster -> ${poster}`);
}

// 4. Report sizes + probe durations.
const { statSync } = await import("node:fs");
for (const f of [desktop, mobile, poster].filter(Boolean)) {
  console.log(`${f.split(/[\\/]/).at(-1)}: ${(statSync(f).size / 1024 / 1024).toFixed(2)} MB`);
}
for (const f of [desktop, mobile].filter(Boolean)) {
  const out = execFileSync(ffmpeg.replace(/ffmpeg(\.exe)?$/, "ffprobe$1"), [
    "-v", "error", "-show_entries", "format=duration,size:stream=width,height,r_frame_rate,nb_frames",
    "-of", "default=noprint_wrappers=1", f,
  ], { encoding: "utf8" });
  console.log(`--- probe ${f.split(/[\\/]/).at(-1)}:\n${out.trim()}`);
}
console.log("DONE");
