#!/usr/bin/env node
/* Contact sheet for generated property artwork (SVGs inlined — no server needed). */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'artwork');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
let html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<style>body{margin:0;background:#14110d;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px;padding:8px}'
  + 'figure{margin:0}svg{width:100%;height:auto;display:block;border-radius:6px}'
  + 'figcaption{color:#d98e32;font:600 11px ui-monospace,monospace;padding:4px 2px}</style></head><body>';
for (const f of files) {
  const svg = fs.readFileSync(path.join(dir, f), 'utf8');
  html += `<figure>${svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" style="aspect-ratio:4/3" ')}<figcaption>${f}</figcaption></figure>`;
}
html += '</body></html>';
fs.writeFileSync(path.join(__dirname, '..', 'artwork-sheet.html'), html);
console.log(`written ${files.length} tiles`);
