#!/usr/bin/env node
/**
 * Frame-source validator: counts, numbering gaps, duplicates (by MD5),
 * corruption (JPEG EOI scan), dimensions — across all extracted zips.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..", "frame-sources");
const zips = ["zip1", "zip2", "zip3", "zip4"];

function md5(buf) {
  return crypto.createHash("md5").digest ? crypto.createHash("md5").update(buf).digest("hex") : "";
}

function jpegTerminatorOk(buf) {
  // scan last 4 bytes region for FFD9
  for (let i = buf.length - 4; i < buf.length - 1; i++) {
    if (buf[i] === 0xff && buf[i + 1] === 0xd9) return true;
  }
  return false;
}

const globalHashes = new Map(); // md5 -> first location seen

for (const zip of zips) {
  const dir = path.join(ROOT, zip);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg"));
  const numbers = files
    .map((f) => parseInt(f.match(/(\d+)\.jpg$/)?.[1] ?? "0", 10))
    .sort((a, b) => a - b);
  const expected = Array.from({ length: numbers[numbers.length - 1] }, (_, i) => i + 1);
  const missing = expected.filter((n) => !numbers.includes(n));
  const dupNums = numbers.filter((n, i, a) => a.indexOf(n) !== i);

  let dims = null;
  let corrupt = [];
  const localHashes = new Map();
  let dupHashes = [];

  for (const f of files) {
    const buf = fs.readFileSync(path.join(dir, f));
    if (!jpegTerminatorOk(buf)) corrupt.push(f);
    // parse SOF for dimensions (offsets: FFC0 FF len prec h h w w)
    for (let p = 2; p < buf.length - 9; p++) {
      if (buf[p] === 0xff && (buf[p + 1] === 0xc0 || buf[p + 1] === 0xc2)) {
        const h = (buf[p + 5] << 8) | buf[p + 6];
        const w = (buf[p + 7] << 8) | buf[p + 8];
        if (!dims) dims = `${w}x${h}`;
        break;
      }
    }
    const hash = md5(buf);
    const loc = `${zip}/${f}`;
    if (globalHashes.has(hash)) dupHashes.push(`${loc} == ${globalHashes.get(hash)}`);
    else globalHashes.set(hash, loc);
    if (localHashes.has(hash)) dupHashes.push(`${loc} dup-in-zip of ${localHashes.get(hash)}`);
    localHashes.set(hash, loc);
  }

  const sizes = files.map((f) => fs.statSync(path.join(dir, f)).size);
  const avg = Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length);

  console.log(`\n=== ${zip} ===`);
  console.log(`files: ${files.length}, numbering: ${numbers[0]}-${numbers[numbers.length - 1]}`);
  console.log(`missing: ${missing.length ? missing.join(",") : "none"}  dupNums: ${dupNums.length}`);
  console.log(`dims: ${dims}  corrupt: ${corrupt.length ? corrupt.join(",") : "none"}`);
  console.log(`avg size: ${avg}B  total: ${(sizes.reduce((a, b) => a + b, 0) / 1e6).toFixed(1)}MB`);
  console.log(`duplicates: ${dupHashes.length ? dupHashes.join(" | ") : "none"}`);
}
