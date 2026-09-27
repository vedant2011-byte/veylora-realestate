#!/usr/bin/env node
/**
 * Veylora — demo property artwork generator.
 *
 * The demo catalogue needs believable imagery without shipping copyrighted
 * photography. This script procedurally composes vector architectural scenes
 * (in the Veylora palette) per property and writes them as .svg — crisp at
 * every device pixel ratio, ~15KB each, no native image dependencies.
 * Deterministic per-slug randomness keeps artwork stable across regenerations.
 *
 * Usage: node tools/generate-artwork.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const JSON_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "properties.json");
const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
const { properties: PROPERTIES } = data;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "artwork");

const W = 1600;
const H = 1200;

/* Deterministic PRNG so every regeneration yields identical artwork. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ── Palette ─────────────────────────────────────────────── */
const P = {
  paper: "#f2ecdf",
  paper2: "#e8dfcd",
  ink: "#2a251d",
  inkSoft: "#4a4234",
  inkMute: "#6f6455",
  amber: "#d98e32",
  amberDeep: "#a9671f",
  clay: "#b4552d",
  sage: "#7c8871",
  sageDeep: "#5d6b52",
  cream: "#f7f2e9",
  night: "#14110d",
  glass: "#c8d2d6",
  glassDim: "#aeb9ba",
  wood: "#a3795a",
};

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Sky backdrops ───────────────────────────────────────── */
function sky(rnd, kind) {
  const stops =
    kind === "dusk"
      ? [
          ["#1c1a24", 0],
          ["#3b3140", 0.42],
          ["#8a5f4a", 0.72],
          ["#d98e50", 0.9],
          ["#e8b070", 1],
        ]
      : kind === "goldenHour"
        ? [
            ["#f0d9b0", 0],
            ["#ecd3a8", 0.55],
            ["#e3bd8a", 1],
          ]
        : [
            ["#dfe3e0", 0],
            ["#e9e7dc", 0.6],
            ["#efe9da", 1],
          ];
  const id = `sky-${Math.floor(rnd() * 1e9)}`;
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
    .map(([c, o]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join("")}</linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#${id})"/>`;
}

function clouds(rnd, count, yMax, opacity) {
  let s = "";
  for (let i = 0; i < count; i++) {
    const cx = rnd() * W;
    const cy = rnd() * yMax;
    const w = 180 + rnd() * 340;
    const h = 26 + rnd() * 50;
    s += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${w.toFixed(0)}" ry="${h.toFixed(0)}" fill="#ffffff" opacity="${(opacity * (0.35 + rnd() * 0.5)).toFixed(2)}"/>`;
  }
  return s;
}

function sun(rnd, x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r * 2.6}" fill="${P.amber}" opacity="0.16"/>
<circle cx="${x}" cy="${y}" r="${r * 1.5}" fill="${P.amber}" opacity="0.28"/>
<circle cx="${x}" cy="${y}" r="${r}" fill="#f4c47c" opacity="0.95"/>`;
}

/* ── Ground and greenery ─────────────────────────────────── */
function ground(rnd, y, tone) {
  return `<rect x="0" y="${y}" width="${W}" height="${H - y}" fill="${tone}"/>
<path d="M0 ${y} Q ${W * 0.3} ${y - 12} ${W * 0.55} ${y + 4} T ${W} ${y - 6} L ${W} ${y} Z" fill="${tone}" opacity="0.9"/>`;
}

function hedge(rnd, x, y, w, h, color) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 3}" fill="${color}"/>`;
  const bumps = Math.max(3, Math.floor(w / 34));
  for (let i = 0; i < bumps; i++) {
    s += `<circle cx="${(x + (i + 0.5) * (w / bumps)).toFixed(0)}" cy="${(y + h * 0.22).toFixed(0)}" r="${(h * 0.34).toFixed(0)}" fill="${color}"/>`;
  }
  return s;
}

function palm(rnd, x, y, scale) {
  const fronds = [];
  const n = 7 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.PI + (i / (n - 1)) * Math.PI;
    const len = (70 + rnd() * 40) * scale;
    const ex = x + Math.cos(a) * len;
    const ey = y + Math.sin(a) * len * 0.62;
    const mx = x + Math.cos(a) * len * 0.5;
    const my = y + Math.sin(a) * len * 0.4 - 16 * scale;
    fronds.push(
      `<path d="M${x} ${y} Q ${mx.toFixed(0)} ${my.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}" stroke="${P.sageDeep}" stroke-width="${(7 * scale).toFixed(1)}" fill="none" stroke-linecap="round"/>`,
    );
  }
  return `<line x1="${x}" y1="${y + 70 * scale}" x2="${x}" y2="${y}" stroke="#7a5a3d" stroke-width="${(10 * scale).toFixed(1)}" stroke-linecap="round"/>${fronds.join("")}`;
}

function tree(rnd, x, y, scale) {
  const r = 46 * scale;
  return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 54 * scale}" stroke="#6d5138" stroke-width="${(9 * scale).toFixed(1)}"/>
<circle cx="${x - r * 0.4}" cy="${y - 70 * scale}" r="${r}" fill="${P.sageDeep}" opacity="0.92"/>
<circle cx="${x + r * 0.5}" cy="${y - 60 * scale}" r="${r * 0.82}" fill="${P.sage}" opacity="0.95"/>
<circle cx="${x}" cy="${y - 92 * scale}" r="${r * 0.7}" fill="#8d987f" opacity="0.9"/>`;
}

function shrubs(rnd, x, y, n, scale) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${(x + i * 26 * scale + rnd() * 10).toFixed(0)}" cy="${(y - 8 * scale).toFixed(0)}" r="${((14 + rnd() * 10) * scale).toFixed(0)}" fill="${rnd() > 0.5 ? P.sageDeep : P.sage}"/>`;
  }
  return s;
}

/* ── Architecture ────────────────────────────────────────── */
function windowPane(x, y, w, h, tone = P.glass, mullion = P.ink) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone}"/>
<line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${mullion}" stroke-width="3"/>
<line x1="${x}" y1="${y + h / 2}" x2="${x + w}" y2="${y + h / 2}" stroke="${mullion}" stroke-width="3"/>`;
}

function slatScreen(rnd, x, y, w, h, color) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="0.28"/>`;
  const n = Math.floor(w / 14);
  for (let i = 0; i < n; i++) {
    s += `<line x1="${x + i * 14 + 4}" y1="${y}" x2="${x + i * 14 + 4}" y2="${y + h}" stroke="${color}" stroke-width="5"/>`;
  }
  return s;
}

/**
 * Compose a modern Indian home elevation. style: flat | pavilion | villa
 * Returns SVG string of the building placed with its base at groundY.
 */
function building(rnd, style, groundY) {
  const s = [];

  if (style === "villa") {
    /* Two-storey composed massing with cantilevered top floor */
    const bx = W * 0.18;
    const bw = W * 0.64;
    const gH = 190;
    const uH = 210;
    const gy = groundY;
    const uy = gy - gH - 14;
    const ty = uy - uH;
    const woodTone = rnd() > 0.5 ? P.wood : "#8d6a4c";

    s.push(`<rect x="${bx - 26}" y="${ty - 18}" width="${bw + 52}" height="20" fill="${P.night}"/>`); // roof slab
    s.push(`<rect x="${bx}" y="${ty}" width="${bw}" height="${uH}" fill="${P.cream}"/>`);
    s.push(`<rect x="${bx + bw * 0.58}" y="${ty}" width="${bw * 0.42}" height="${uH}" fill="${P.ink}"/>`);
    s.push(slats(rnd, bx + bw * 0.58, ty + 24, bw * 0.42, 56));
    s.push(windowPane(bx + bw * 0.06, ty + 28, bw * 0.2, 88, P.glass));
    s.push(windowPane(bx + bw * 0.31, ty + 28, bw * 0.2, 88, P.glassDim));
    s.push(`<rect x="${bx}" y="${gy - gH - 14}" width="${bw}" height="14" fill="${P.night}" opacity="0.85"/>`);
    s.push(`<rect x="${bx}" y="${gy - gH}" width="${bw}" height="${gH}" fill="${P.paper2}"/>`);
    s.push(`<rect x="${bx}" y="${gy - gH}" width="${bw * 0.3}" height="${gH}" fill="${woodTone}"/>`);
    for (let i = 0; i < 9; i++) {
      s.push(`<line x1="${bx + 10 + i * (bw * 0.3) / 9}" y1="${gy - gH}" x2="${bx + 10 + i * (bw * 0.3) / 9}" y2="${gy}" stroke="#00000022" stroke-width="4"/>`);
    }
    s.push(windowPane(bx + bw * 0.38, gy - gH + 34, bw * 0.24, gH - 78, P.glass));
    s.push(`<rect x="${bx + bw * 0.68}" y="${gy - 120}" width="${bw * 0.24}" height="120" fill="${P.night}"/>`);
    s.push(windowPane(bx + bw * 0.7, gy - 100, bw * 0.2, 62, P.glassDim, P.cream));
    /* door */
    s.push(`<rect x="${bx + bw * 0.335}" y="${gy - 96}" width="52" height="96" fill="${P.night}"/>`);
    s.push(`<circle cx="${bx + bw * 0.335 + 40}" cy="${gy - 48}" r="3.5" fill="${P.amber}"/>`);
    /* steps + path */
    s.push(`<rect x="${bx + bw * 0.3}" y="${gy}" width="120" height="10" fill="${P.inkMute}"/>`);
    s.push(`<rect x="${bx + bw * 0.31}" y="${gy + 10}" width="104" height="10" fill="${P.inkMute}" opacity="0.75"/>`);
    s.push(`<rect x="${bx + bw * 0.36}" y="${gy + 20}" width="70" height="${H - gy - 20}" fill="${P.paper2}" opacity="0.8"/>`);
  }

  if (style === "pavilion") {
    /* Low horizontal modern home with deep overhang */
    const bx = W * 0.12;
    const bw = W * 0.76;
    const h = 240;
    const gy = groundY;
    const ty = gy - h;
    s.push(`<rect x="${bx - 40}" y="${ty - 16}" width="${bw + 80}" height="18" fill="${P.night}"/>`);
    s.push(`<rect x="${bx}" y="${ty}" width="${bw}" height="${h}" fill="${P.cream}"/>`);
    s.push(`<rect x="${bx}" y="${ty}" width="${bw * 0.24}" height="${h}" fill="${P.ink}"/>`);
    s.push(slats(rnd, bx, ty + 20, bw * 0.24, h - 60));
    s.push(windowPane(bx + bw * 0.3, ty + 34, bw * 0.42, h - 90, P.glass));
    s.push(`<rect x="${bx + bw * 0.3 - 8}" y="${ty + 26}" width="${bw * 0.42 + 16}" height="8" fill="${P.night}" opacity="0.7"/>`);
    s.push(`<rect x="${bx + bw * 0.78}" y="${ty + 30}" width="${bw * 0.18}" height="${h - 60}" fill="${P.paper2}"/>`);
    s.push(windowPane(bx + bw * 0.8, ty + 52, bw * 0.14, 74, P.glassDim));
    s.push(`<rect x="${bx + bw * 0.28}" y="${gy - 92}" width="58" height="92" fill="${P.night}"/>`);
    s.push(`<circle cx="${bx + bw * 0.28 + 44}" cy="${gy - 46}" r="3.5" fill="${P.amber}"/>`);
    s.push(`<rect x="${bx + bw * 0.2}" y="${gy}" width="260" height="9" fill="${P.inkMute}"/>`);
    s.push(`<rect x="${bx + bw * 0.22}" y="${gy + 9}" width="224" height="9" fill="${P.inkMute}" opacity="0.7"/>`);
    s.push(`<rect x="${bx + bw * 0.3}" y="${gy + 18}" width="130" height="${H - gy - 18}" fill="${P.paper2}" opacity="0.75"/>`);
  }

  if (style === "flat") {
    /* Compact double-storey, pitched warm-parapet silhouette */
    const bx = W * 0.2;
    const bw = W * 0.6;
    const h1 = 150;
    const h2 = 170;
    const gy = groundY;
    const y1 = gy - h1 - 12;
    const y2 = y1 - h2;
    s.push(`<rect x="${bx - 22}" y="${y2 - 16}" width="${bw + 44}" height="18" fill="${P.night}"/>`);
    s.push(`<rect x="${bx}" y="${y2}" width="${bw * 0.55}" height="${h2}" fill="${P.cream}"/>`);
    s.push(`<rect x="${bx + bw * 0.55}" y="${y2}" width="${bw * 0.45}" height="${h2}" fill="${P.ink}"/>`);
    s.push(windowPane(bx + bw * 0.08, y2 + 26, bw * 0.34, 86, P.glass));
    s.push(windowPane(bx + bw * 0.62, y2 + 30, bw * 0.3, 74, P.glassDim));
    s.push(`<rect x="${bx}" y="${y1 - 12}" width="${bw}" height="12" fill="${P.night}" opacity="0.85"/>`);
    s.push(`<rect x="${bx}" y="${y1}" width="${bw}" height="${h1}" fill="${P.paper2}"/>`);
    s.push(`<rect x="${bx}" y="${y1}" width="${bw * 0.22}" height="${h1}" fill="${P.wood}"/>`);
    s.push(windowPane(bx + bw * 0.32, y1 + 30, bw * 0.3, h1 - 66, P.glass));
    s.push(`<rect x="${bx + bw * 0.7}" y="${gy - 104}" width="${bw * 0.22}" height="104" fill="${P.night}"/>`);
    s.push(windowPane(bx + bw * 0.72, gy - 86, bw * 0.18, 56, P.glassDim, P.cream));
    s.push(`<rect x="${bx + bw * 0.32}" y="${gy - 88}" width="50" height="88" fill="${P.night}"/>`);
    s.push(`<circle cx="${bx + bw * 0.32 + 37}" cy="${gy - 44}" r="3.2" fill="${P.amber}"/>`);
    s.push(`<rect x="${bx + bw * 0.28}" y="${gy}" width="120" height="9" fill="${P.inkMute}"/>`);
    s.push(`<rect x="${bx + bw * 0.36}" y="${gy + 9}" width="80" height="${H - gy - 9}" fill="${P.paper2}" opacity="0.75"/>`);
  }

  return s.join("\n");
}

function slats(rnd, x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#00000030"/>`;
  const n = Math.floor(w / 16);
  for (let i = 0; i < n; i++) {
    s += `<line x1="${x + i * 16 + 5}" y1="${y}" x2="${x + i * 16 + 5}" y2="${y + h}" stroke="${P.night}" stroke-width="6" opacity="0.9"/>`;
  }
  return s;
}

function pool(rnd, x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h * 0.16}" fill="#8fb6c0"/>
<rect x="${x}" y="${y}" width="${w}" height="${h * 0.4}" rx="${h * 0.16}" fill="#a9cbd2" opacity="0.8"/>
<rect x="${x - 14}" y="${y + h}" width="${w + 28}" height="14" fill="${P.paper2}" opacity="0.9"/>`;
}

function car(rnd, x, y, scale, tone) {
  const w = 190 * scale;
  const h = 58 * scale;
  return `<g>
<rect x="${x}" y="${y - h}" width="${w}" height="${h * 0.62}" rx="${h * 0.3}" fill="${tone}"/>
<path d="M${x + w * 0.18} ${y - h * 0.38} L ${x + w * 0.3} ${y - h * 1.55} L ${x + w * 0.78} ${y - h * 1.5} L ${x + w * 0.94} ${y - h * 0.38} Z" fill="${tone}"/>
<rect x="${x + w * 0.33}" y="${y - h * 1.4}" width="${w * 0.2}" height="${h * 0.8}" rx="4" fill="${P.glassDim}"/>
<rect x="${x + w * 0.57}" y="${y - h * 1.38}" width="${w * 0.18}" height="${h * 0.78}" rx="4" fill="${P.glassDim}"/>
<circle cx="${x + w * 0.22}" cy="${y}" r="${h * 0.42}" fill="${P.night}"/>
<circle cx="${x + w * 0.22}" cy="${y}" r="${h * 0.18}" fill="${P.inkMute}"/>
<circle cx="${x + w * 0.8}" cy="${y}" r="${h * 0.42}" fill="${P.night}"/>
<circle cx="${x + w * 0.8}" cy="${y}" r="${h * 0.18}" fill="${P.inkMute}"/>
</g>`;
}

/* ── Per-type scene builders ─────────────────────────────── */
function sceneApartment(rnd, slug) {
  const towers = 3 + Math.floor(rnd() * 2);
  const baseY = H * 0.86;
  let s = sky(rnd, rnd() > 0.5 ? "day" : "goldenHour") + clouds(rnd, 5, H * 0.3, 0.5);
  s += ground(rnd, baseY, P.paper2);
  const widths = [];
  for (let i = 0; i < towers; i++) widths.push(150 + rnd() * 110);
  let x = W * 0.5 - widths.reduce((a, b) => a + b, 0) / 2 - 40;
  for (let i = 0; i < towers; i++) {
    const w = widths[i];
    const h = 300 + rnd() * 300 + (i === 1 ? 120 : 0);
    const top = baseY - h;
    const tone = i % 2 === 0 ? P.cream : P.paper2;
    s += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="${tone}"/>`;
    s += `<rect x="${x}" y="${top}" width="${w}" height="14" fill="${P.night}"/>`;
    const cols = Math.max(2, Math.floor(w / 78));
    const rows = Math.floor((h - 60) / 92);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const lit = rnd() > 0.72;
        s += `<rect x="${x + 14 + c * (w / cols) + 8}" y="${top + 44 + r * 92}" width="${w / cols - 26}" height="54" fill="${lit ? P.amber : P.glass}" opacity="${lit ? 0.85 : 0.92}"/>`;
        s += `<line x1="${x + 14 + c * (w / cols) + 8}" y1="${top + 44 + r * 92 + 27}" x2="${x + 14 + c * (w / cols) + (w / cols - 26) + 8}" y2="${top + 44 + r * 92 + 27}" stroke="${P.ink}" stroke-width="2.5" opacity="0.5"/>`;
      }
    }
    /* balcony ledges */
    for (let r = 0; r < rows; r++) {
      s += `<rect x="${x + 6}" y="${top + 44 + r * 92 + 58}" width="${w - 12}" height="6" fill="${P.inkMute}" opacity="0.55"/>`;
    }
    x += w + 46;
  }
  s += hedge(rnd, W * 0.06, baseY - 26, W * 0.24, 30, P.sageDeep);
  s += hedge(rnd, W * 0.72, baseY - 26, W * 0.22, 30, P.sage);
  s += tree(rnd, W * 0.09, baseY - 24, 1.15);
  s += palm(rnd, W * 0.92, baseY - 20, 1.0);
  s += `<rect x="0" y="${baseY + 66}" width="${W}" height="${H - baseY - 66}" fill="${P.inkMute}" opacity="0.35"/>`;
  return s;
}

function sceneVilla(rnd, slug) {
  const dusk = rnd() > 0.45;
  let s = sky(rnd, dusk ? "dusk" : "goldenHour") + clouds(rnd, 4, H * 0.32, 0.35);
  if (dusk) s += sun(rnd, W * (0.2 + rnd() * 0.6), H * 0.62, 42);
  const gy = H * 0.78;
  s += ground(rnd, gy, dusk ? "#3a3a2e" : "#b9b29b");
  s += building(rnd, "villa", gy);
  s += pool(rnd, W * 0.06, gy + 26, 300, 110);
  s += palm(rnd, W * 0.05, gy + 40, 1.25);
  s += palm(rnd, W * 0.96, gy + 30, 1.05);
  s += shrubs(rnd, W * 0.55, gy + 60, 5, 1.2);
  s += car(rnd, W * 0.6, gy + 130, 1.0, dusk ? "#7a2f22" : "#8c3a2a");
  return s;
}

function sceneRowhouse(rnd, slug) {
  let s = sky(rnd, "goldenHour") + clouds(rnd, 4, H * 0.28, 0.4);
  const gy = H * 0.8;
  s += ground(rnd, gy, "#c2bba4");
  /* repeated terrace units */
  const uw = 250;
  const n = 4;
  const startX = W * 0.5 - (n * uw) / 2;
  for (let i = 0; i < n; i++) {
    const x = startX + i * (uw + 26);
    const h = 300 + (i % 2) * 40;
    const top = gy - h;
    const tone = i % 2 === 0 ? P.cream : P.paper2;
    s += `<rect x="${x}" y="${top}" width="${uw}" height="${h}" fill="${tone}"/>`;
    s += `<rect x="${x}" y="${top}" width="${uw}" height="14" fill="${P.night}"/>`;
    s += slats(rnd, x + uw * 0.62, top + 26, uw * 0.3, 62);
    s += windowPane(x + uw * 0.12, top + 30, uw * 0.34, 76, P.glass);
    s += windowPane(x + 30, gy - 120, 70, 84, P.glass);
    s += `<rect x="${x + uw * 0.62}" y="${gy - 104}" width="${uw * 0.3}" height="104" fill="${P.night}"/>`;
    s += windowPane(x + uw * 0.66, gy - 86, uw * 0.22, 52, P.glassDim, P.cream);
    s += `<rect x="${x + uw * 0.36}" y="${gy - 84}" width="44" height="84" fill="${P.night}"/>`;
    s += `<rect x="${x + uw * 0.36 + 32}" y="${gy - 44}" r="3" fill="${P.amber}"/>`;
    s += hedge(rnd, x - 8, gy - 22, uw + 16, 24, i % 2 ? P.sage : P.sageDeep);
    s += `<rect x="${x + 6}" y="${gy}" width="${uw - 12}" height="${H - gy - 8}" fill="${P.paper2}" opacity="0.6"/>`;
  }
  s += palm(rnd, W * 0.04, gy + 46, 1.1);
  s += tree(rnd, W * 0.95, gy + 60, 1.2);
  return s;
}

function sceneIndependent(rnd, slug) {
  let s = sky(rnd, rnd() > 0.5 ? "day" : "goldenHour") + clouds(rnd, 5, H * 0.3, 0.45);
  const gy = H * 0.8;
  s += ground(rnd, gy, "#cfc7ae");
  s += building(rnd, "flat", gy);
  s += tree(rnd, W * 0.1, gy + 40, 1.35);
  s += tree(rnd, W * 0.9, gy + 56, 1.1);
  s += shrubs(rnd, W * 0.14, gy + 120, 6, 1.1);
  s += `<rect x="${W * 0.32}" y="${gy + 96}" width="420" height="10" fill="${P.inkMute}" opacity="0.5"/>`;
  s += car(rnd, W * 0.72, gy + 150, 0.95, "#4c5a68");
  return s;
}

function scenePlot(rnd, slug) {
  /* Aerial-style plot with the amber survey annotation, echoing the footage */
  let s = `<rect width="${W}" height="${H}" fill="#b9bfa8"/>`;
  /* field texture */
  for (let i = 0; i < 60; i++) {
    s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${8 + rnd() * 26}" fill="#a8b094" opacity="0.5"/>`;
  }
  for (let i = 0; i < 26; i++) {
    s += `<circle cx="${rnd() * W}" cy="${rnd() * H}" r="${6 + rnd() * 18}" fill="#c7ccad" opacity="0.5"/>`;
  }
  /* roads */
  s += `<rect x="0" y="${H * 0.72}" width="${W}" height="${H * 0.14}" fill="#6e6a60"/>`;
  s += `<rect x="0" y="${H * 0.72}" width="${W}" height="6" fill="#8a8578" opacity="0.8"/>`;
  s += `<rect x="${W * 0.62}" y="0" width="${W * 0.1}" height="${H}" fill="#77736a" opacity="0.85"/>`;
  /* neighbouring homes */
  for (let i = 0; i < 4; i++) {
    const hx = W * (0.05 + i * 0.24);
    const hy = H * 0.2 + rnd() * H * 0.14;
    const hw = 150 + rnd() * 90;
    s += `<rect x="${hx}" y="${hy}" width="${hw}" height="${hw * 0.62}" fill="${P.cream}"/>`;
    s += `<rect x="${hx}" y="${hy}" width="${hw}" height="${hw * 0.1}" fill="${P.night}" opacity="0.75"/>`;
    s += `<rect x="${hx - 20}" y="${hy - 26}" width="${hw + 40}" height="20" fill="#9b9480" opacity="0.7"/>`;
  }
  /* the plot, surveyed in amber */
  const px = W * 0.16;
  const py = H * 0.3;
  const pw = W * 0.5;
  const ph = H * 0.34;
  s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="#a3a265" opacity="0.85"/>`;
  s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="${P.amber}" stroke-width="10" opacity="0.95"/>`;
  s += `<rect x="${px - 14}" y="${py - 14}" width="${pw + 28}" height="${ph + 28}" fill="none" stroke="${P.amber}" stroke-width="3" opacity="0.5"/>`;
  /* corner ticks */
  const ticks = [
    [px, py],
    [px + pw, py],
    [px, py + ph],
    [px + pw, py + ph],
  ];
  for (const [cx, cy] of ticks) {
    s += `<circle cx="${cx}" cy="${cy}" r="12" fill="${P.amber}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="5" fill="#fff" opacity="0.9"/>`;
  }
  /* annotation card */
  s += `<rect x="${px + pw * 0.52}" y="${py - 84}" width="290" height="66" rx="14" fill="#ffffff" opacity="0.94"/>`;
  s += `<rect x="${px + pw * 0.52}" y="${py - 84}" width="290" height="66" rx="14" fill="none" stroke="${P.amber}" stroke-width="3" opacity="0.8"/>`;
  s += `<text x="${px + pw * 0.52 + 26}" y="${py - 40}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${P.ink}">312 m²</text>`;
  s += `<line x1="${px + pw * 0.52}" y1="${py - 18}" x2="${px + pw * 0.62}" y2="${py + 26}" stroke="${P.amber}" stroke-width="4"/>`;
  return s;
}

function scenePenthouse(rnd, slug) {
  let s = sky(rnd, "dusk") + clouds(rnd, 3, H * 0.22, 0.3);
  s += sun(rnd, W * 0.72, H * 0.3, 46);
  /* distant skyline */
  s += `<rect x="0" y="${H * 0.55}" width="${W}" height="${H * 0.45}" fill="#221f28"/>`;
  const bars = 14;
  for (let i = 0; i < bars; i++) {
    const bw = 60 + rnd() * 90;
    const bh = 90 + rnd() * 210;
    const bx = (i / bars) * W + rnd() * 30;
    s += `<rect x="${bx}" y="${H * 0.55 - bh}" width="${bw}" height="${bh}" fill="#2e2a36" opacity="0.9"/>`;
    for (let k = 0; k < 4; k++) {
      if (rnd() > 0.5)
        s += `<rect x="${bx + 10 + rnd() * (bw - 26)}" y="${H * 0.55 - bh + 14 + rnd() * (bh - 40)}" width="10" height="14" fill="${P.amber}" opacity="0.8"/>`;
    }
  }
  /* terrace in the foreground */
  const ty = H * 0.58;
  s += `<rect x="0" y="${ty}" width="${W}" height="26" fill="${P.night}"/>`;
  s += `<rect x="0" y="${ty + 26}" width="${W}" height="${H - ty - 26}" fill="#1b181f"/>`;
  s += `<rect x="${W * 0.06}" y="${ty + 60}" width="360" height="${H - ty - 60}" fill="#26222c"/>`;
  s += slats(rnd, W * 0.06, ty + 84, 360, 90);
  s += `<rect x="${W * 0.4}" y="${ty + 70}" width="520" height="150" rx="10" fill="#322c3a"/>`;
  s += `<rect x="${W * 0.42}" y="${ty + 88}" width="480" height="120" fill="${P.glassDim}" opacity="0.35"/>`;
  s += `<line x1="${W * 0.4}" y1="${ty + 145}" x2="${W * 0.4 + 520}" y2="${ty + 145}" stroke="#4a4356" stroke-width="5"/>`;
  s += hedge(rnd, W * 0.05, ty + 34, W * 0.3, 22, "#3d4a38");
  s += `<ellipse cx="${W * 0.78}" cy="${ty + 190}" rx="200" ry="54" fill="#3a3444"/>`;
  s += `<ellipse cx="${W * 0.78}" cy="${ty + 178}" rx="200" ry="54" fill="#57626e" opacity="0.9"/>`;
  return s;
}

const SCENES = {
  apartment: sceneApartment,
  villa: sceneVilla,
  rowhouse: sceneRowhouse,
  independent: sceneIndependent,
  plot: scenePlot,
  penthouse: scenePenthouse,
};

/* ── Frame + render ──────────────────────────────────────── */
function frame(rnd, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}
<rect x="0" y="0" width="${W}" height="10" fill="${P.night}"/>
<rect x="0" y="${H - 10}" width="${W}" height="10" fill="${P.night}"/></svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const p of PROPERTIES) {
    const seed = hashString(p.slug);
    const rnd = mulberry32(seed);
    const scene = SCENES[p.artScene] ?? sceneIndependent;
    const svg = frame(rnd, scene(rnd, p.slug));
    const out = path.join(OUT_DIR, `${p.slug}.svg`);
    fs.writeFileSync(out, svg);
  }
  console.log(`Artwork written to ${OUT_DIR} (${PROPERTIES.length} files)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
