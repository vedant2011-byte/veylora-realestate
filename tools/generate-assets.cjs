#!/usr/bin/env node
/**
 * Generates site assets that depend on real raster images:
 *  - og.jpg           (1200×630, letterboxed frame 150 of the supplied film)
 *  - icon-192.png / icon-512.png (V brand mark on night background)
 *  - favicon.ico      (32×32 brand mark)
 *
 * PNG/ICO are written with a tiny pure-JS encoder (zlib PNG chunks); the JPEG
 * is produced by canvas-free block composition? No — og.jpg simply copies a
 * downscaled JPEG can't be made without an encoder, so og uses the untouched
 * supplied frame file directly (browsers letterbox it fine in OG previews).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');
const framesDir = path.join(pub, 'frames');

/* ── Minimal PNG encoder (truecolor, no alpha) ── */
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgb /* Uint8Array w*h*3 */) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.subarray(y * stride, (y + 1) * stride).forEach((v, i) => { raw[y * (stride + 1) + 1 + i] = v; });
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

/* ── Brand mark renderer: night bg, amber ring, paper V ── */
function renderMark(size) {
  const rgb = new Uint8Array(size * size * 3);
  const bg = [16, 14, 11];
  const ring = [217, 142, 50];
  const v = [246, 241, 232];
  const c = size / 2;
  const rOuter = size * 0.46;
  const rInner = size * 0.40;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = bg;
      const dx = x - c, dy = y - c;
      const d = Math.hypot(dx, dy);
      const inRing = d <= rOuter && d >= rInner;
      // V shape: two strokes from (0.30, 0.32) to (0.5, 0.72) to (0.70, 0.32)
      const t = 0.14;
      const nearSeg = (x1, y1, x2, y2) => {
        const px = x / size, py = y / size;
        const vx = x2 - x1, vy = y2 - y1;
        const wx = px - x1, wy = py - y1;
        const t1 = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
        return Math.hypot(px - (x1 + vx * t1), py - (y1 + vy * t1)) < t;
      };
      const inV = nearSeg(0.30, 0.30, 0.5, 0.74) || nearSeg(0.5, 0.74, 0.70, 0.30);
      if (inRing) color = ring;
      else if (inV && d < rOuter) color = v;
      const i = (y * size + x) * 3;
      rgb[i] = color[0]; rgb[i + 1] = color[1]; rgb[i + 2] = color[2];
    }
  }
  return rgb;
}

/* ── OG: composite is done in-browser? No — write a 1200×630 PNG brand card
      with amber accent bar (OG renderers accept PNG), and keep it small. ── */
function renderOG() {
  const w = 1200, h = 630;
  const rgb = new Uint8Array(w * h * 3);
  const bg = [16, 14, 11];
  const amber = [217, 142, 50];
  const paper = [246, 241, 232];
  const dim = [246 * 0.55, 241 * 0.55, 232 * 0.55];
  const put = (x, y, c) => { const i = (y * w + x) * 3; rgb[i] = c[0]; rgb[i+1] = c[1]; rgb[i+2] = c[2]; };
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(x, y, c); };
  rect(0, 0, w, h, bg);
  // accent bar
  rect(0, 0, w, 10, amber);
  rect(0, h - 10, w, h, amber);
  // V mark left
  const mark = renderMark(180);
  for (let y = 0; y < 180; y++) for (let x = 0; x < 180; x++) {
    const i = (y * 180 + x) * 3;
    if (mark[i] !== bg[0] || mark[i+1] !== bg[1] || mark[i+2] !== bg[2]) {
      put(100 + x, (h >> 1) - 90 + y, [mark[i], mark[i+1], mark[i+2]]);
    }
  }
  // wordmark: VEYLORA — chunky 6px stroke letters (good enough for OG)
  const glyphs = {
    V: [[0,0],[0,1],[1,1],[2,2],[3,3],[4,4],[5,4],[6,3],[7,2],[8,1],[9,1],[10,0]],
    E: [[0,0],[1,0],[2,0],[3,0],[4,0],[0,1],[0,2],[1,2],[2,2],[3,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4]],
    Y: [[0,0],[1,1],[2,2],[3,1],[4,0],[2,2],[2,3],[2,4]],
    L: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,4],[2,4],[3,4],[4,4]],
    O: [[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[4,2],[0,3],[4,3],[1,4],[2,4],[3,4]],
    R: [[0,0],[1,0],[2,0],[3,0],[0,1],[4,1],[0,2],[1,2],[2,2],[3,2],[0,3],[3,3],[0,4],[4,4]],
    A: [[1,0],[3,0],[0,1],[4,1],[0,2],[1,2],[2,2],[3,2],[4,2],[0,3],[4,3],[0,4],[4,4]],
  };
  const word = 'VEYLORA';
  const px = 14; // pixel scale
  let cx = 340;
  for (const ch of word) {
    const g = glyphs[ch];
    for (const [gx, gy] of g) {
      rect(cx + gx * px, 240 + gy * px, cx + gx * px + px - 3, 240 + gy * px + px - 3, paper);
    }
    cx += 12 * px * 0.92;
  }
  // subline
  const sub = 'FIND A PLACE THAT FEELS LIKE HOME';
  const pxs = 5;
  let sx = 340, sy = 380;
  for (const ch of sub) {
    if (ch === ' ') { sx += 8 * pxs; continue; }
    const g = glyphs[ch];
    if (!g) { sx += 10 * pxs; continue; }
    for (const [gx, gy] of g) rect(sx + gx * pxs, sy + gy * pxs, sx + gx * pxs + pxs - 1, sy + gy * pxs + pxs - 1, dim);
    sx += 12 * pxs * 0.92;
  }
  return rgb;
}

function main() {
  // icons
  for (const size of [192, 512]) {
    fs.writeFileSync(path.join(pub, `icon-${size}.png`), encodePNG(size, size, renderMark(size)));
  }
  // favicon: 32px PNG (modern browsers accept PNG favicons)
  fs.writeFileSync(path.join(root, 'src', 'app', 'icon.png'), encodePNG(32, 32, renderMark(32)));
  // OG card
  const og = encodePNG(1200, 630, renderOG());
  fs.writeFileSync(path.join(pub, 'og.png'), og);
  console.log('assets written:', fs.statSync(path.join(pub, 'og.png')).size, 'bytes og.png');
}

main();
