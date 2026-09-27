#!/usr/bin/env node
/* Generates a contact sheet of sample frames so we can see the footage. */
const fs = require('fs');
const path = require('path');

const framesDir = path.join(__dirname, '..', 'public', 'frames');
const picks = process.argv.length > 2
  ? process.argv.slice(2).map(Number)
  : [1, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150];

let html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<style>body{margin:0;background:#0c0b09;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;padding:6px}'
  + 'figure{margin:0;position:relative}img{width:100%;display:block}'
  + 'figcaption{position:absolute;bottom:6px;left:8px;color:#fff;font:600 12px ui-monospace,monospace;text-shadow:0 1px 3px #000}</style></head><body>';

for (const i of picks) {
  const n = String(i).padStart(3, '0');
  const buf = fs.readFileSync(path.join(framesDir, `ezgif-frame-${n}.jpg`));
  html += `<figure><img src="data:image/jpeg;base64,${buf.toString('base64')}"><figcaption>${n}</figcaption></figure>`;
}
html += '</body></html>';

const out = path.join(__dirname, '..', 'frames-sheet.html');
fs.writeFileSync(out, html);
console.log(`written ${out} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB, ${picks.length} frames)`);
