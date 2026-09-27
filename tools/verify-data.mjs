/* Verify the demo catalogue: counts, uniqueness, required fields. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const JSON_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "properties.json",
);
const { properties: PROPERTIES, instagramUrl: INSTAGRAM_URL } = JSON.parse(
  fs.readFileSync(JSON_PATH, "utf8"),
);

console.log("properties:", PROPERTIES.length);
console.log("instagram ok:", INSTAGRAM_URL.startsWith("https://www.instagram.com/veylora_.1"));
const cities = [...new Set(PROPERTIES.map((p) => p.city))];
console.log("cities:", cities.join(", "));
const dupes = PROPERTIES.map((p) => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
console.log("duplicate slugs:", dupes.length ? dupes.join(", ") : "none");

const fields = [
  "slug", "name", "location", "price", "area", "amenities",
  "specifications", "nearby", "description", "shortDescription",
  "highlights", "tagline", "artScene",
];
let missing = 0;
for (const p of PROPERTIES) {
  for (const f of fields) {
    if (p[f] === undefined || p[f] === "") {
      console.log("MISSING", p.slug, f);
      missing++;
    }
  }
}
console.log(missing === 0 ? "all fields present" : `${missing} missing fields`);
