#!/usr/bin/env node
/**
 * Builds the master frame library + manifest.
 *
 * Copies every sequence into public/frames/<group>/ and writes
 * src/data/frame-manifest.json. Global order follows the visual continuity
 * found by inspecting the actual frames:
 *
 *   orig (150): aerial plot → AR survey → wireframe → keys → dusk home → plan
 *   zip1 (163): street exterior → concrete shell → AR furniture → finished cream interior
 *   zip2 (163): interior moments → garage → day exteriors → hand sketches → dusk
 *   zip4 (167): exploded axonometric → plans overlay → storm → MEP X-ray → beauty shots
 *   zip3 (166): pool deck → loungers → family cooking at the island (life finale)
 *
 * Total: 809 frames ≈ 36.5 MB JPEG. The manifest records every frame's path
 * plus chapter boundaries for the scroll storytelling system.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const SOURCES = path.join(ROOT, "frame-sources");
const SRC_ORIG = path.join(SOURCES, "orig");

const OUT_DIR = path.join(__dirname, "..", "public", "frames");
const MANIFEST_PATH = path.join(__dirname, "..", "src", "data", "frame-manifest.json");

const pad = (n) => String(n).padStart(4, "0");
const listSorted = (dir) =>
  fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

const groups = [
  { id: "vision", title: "The Land Becomes a Line", srcDir: SRC_ORIG, prefix: "ezgif-frame-", width: 720, height: 1280 },
  { id: "structure", title: "Concrete and Light", srcDir: path.join(SOURCES, "zip1"), prefix: "ezgif-frame-", width: 1080, height: 1920 },
  { id: "material", title: "Warmth Moves In", srcDir: path.join(SOURCES, "zip2"), prefix: "ezgif-frame-", width: 1080, height: 1920 },
  { id: "engineering", title: "Every Line Considered", srcDir: path.join(SOURCES, "zip4"), prefix: "ezgif-frame-", width: 1080, height: 1920 },
  { id: "living", title: "Life Finds Its Room", srcDir: path.join(SOURCES, "zip3"), prefix: "ezgif-frame-", width: 1080, height: 1920 },
];

/* Chapters across the GLOBAL timeline (fractions 0..1), tuned to the footage. */
const CHAPTERS = [
  { num: "01", title: "THE LAND", line: "Every home begins with a place.", from: 0.02, to: 0.14 },
  { num: "02", title: "THE STRUCTURE", line: "Concrete waits for a story.", from: 0.18, to: 0.37 },
  { num: "03", title: "THE VISION", line: "Rooms appear before walls do.", from: 0.41, to: 0.58 },
  { num: "04", title: "THE CRAFT", line: "Every line, considered twice.", from: 0.62, to: 0.79 },
  { num: "05", title: "THE HOME", line: "Light learns where to live.", from: 0.83, to: 0.94 },
  { num: "06", title: "YOUR NEXT ADDRESS", line: "Life begins at the kitchen island.", from: 0.955, to: 1.01 },
];

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

let globalIndex = 0;
const frames = [];
const groupMeta = [];

for (const g of groups) {
  const files = listSorted(g.srcDir);
  const destDir = path.join(OUT_DIR, g.id);
  fs.mkdirSync(destDir, { recursive: true });
  const groupStart = globalIndex;
  for (const f of files) {
    const src = path.join(g.srcDir, f);
    const dest = path.join(destDir, `${g.id}-${pad(globalIndex + 1)}.jpg`);
    fs.copyFileSync(src, dest);
    frames.push({
      i: globalIndex,
      g: g.id,
      src: `/frames/${g.id}/${g.id}-${pad(globalIndex + 1)}.jpg`,
      w: g.width,
      h: g.height,
    });
    globalIndex++;
  }
  groupMeta.push({ id: g.id, title: g.title, start: groupStart, count: files.length, w: g.width, h: g.height });
  console.log(`${g.id}: ${files.length} frames (global ${groupStart + 1}-${globalIndex})`);
}

/* Mixed-dimension note: the original 150 is 720×1280, the rest 1080×1920 —
   both are 9:16, so the renderer treats them uniformly via aspect ratio. */
const manifest = {
  version: 2,
  total: frames.length,
  aspect: 9 / 16,
  groups: groupMeta,
  chapters: CHAPTERS,
  bytes: fs.readdirSync(OUT_DIR).reduce((acc, d) => {
    const dir = path.join(OUT_DIR, d);
    return acc + fs.readdirSync(dir).reduce((a, f) => a + fs.statSync(path.join(dir, f)).size, 0);
  }, 0),
  frames,
};

fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest));
console.log(`\nmanifest: ${frames.length} frames, ${(manifest.bytes / 1e6).toFixed(1)} MB → ${MANIFEST_PATH}`);
