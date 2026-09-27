#!/usr/bin/env node
/* Verify every property photo URL: HTTP 200 + image content-type. */
const URLS = process.argv.slice(2);
if (!URLS.length) {
  console.log("usage: node verify-photos.mjs <url> [<url>...]");
  process.exit(0);
}
for (const u of URLS) {
  try {
    const r = await fetch(u, { method: "HEAD" });
    const ct = r.headers.get("content-type") ?? "?";
    const ok = r.ok && ct.startsWith("image/");
    console.log(`${ok ? "OK " : "FAIL"} ${r.status} ${ct} ${u.slice(0, 90)}`);
  } catch (e) {
    console.log(`ERR  ${String(e).slice(0, 60)} ${u.slice(0, 90)}`);
  }
}
