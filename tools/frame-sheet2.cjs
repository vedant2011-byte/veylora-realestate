#!/usr/bin/env node
/* Contact sheets: first/middle/last stretch of every zip, inlined. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "frame-sources");
const zips = process.argv.length > 2 ? process.argv.slice(2) : ["zip1", "zip2", "zip3", "zip4"];

let html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#0c0b09;color:#d98e32;font:12px monospace}
h2{padding:10px 8px 4px;font-size:13px;letter-spacing:2px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px;padding:6px}
figure{margin:0;position:relative}img{width:100%;display:block;border-radius:4px}
figcaption{position:absolute;bottom:4px;left:6px;color:#fff;font:600 11px monospace;text-shadow:0 1px 3px #000}
</style></head><body>`;

for (const zip of zips) {
  const dir = path.join(ROOT, zip);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  const n = files.length;
  // sample: start, quarter, mid, three-quarter, end
  const picks = [1, Math.round(n * 0.15), Math.round(n * 0.3), Math.round(n * 0.45), Math.round(n * 0.6), Math.round(n * 0.75), Math.round(n * 0.9), n];
  html += `<h2>${zip} (${n} frames) — start/quarter/mid/3q/end</h2><div class="grid">`;
  for (const p of picks) {
    const name = files.find((f) => parseInt(f.match(/\d+/)[0], 10) === p) ?? files[p - 1];
    if (!name) continue;
    const b64 = fs.readFileSync(path.join(dir, name)).toString("base64");
    html += `<figure><img src="data:image/jpeg;base64,${b64}"><figcaption>${zip} #${p}</figcaption></figure>`;
  }
  html += `</div>`;
}
html += `</body></html>`;

const out = path.join(__dirname, "..", "..", "frames-sheet2.html");
fs.writeFileSync(out, html);
console.log(`written ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
