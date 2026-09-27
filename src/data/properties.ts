/**
 * Veylora demo property catalogue — typed façade over the JSON source of truth.
 * In production this layer becomes the API/DB boundary: swap the import for a
 * fetch and keep every UI component unchanged. (The .mjs + generator tooling
 * regenerates properties.json — run `node tools/export-json.mjs`.)
 */
import raw from "./properties.json";
import type { Property, SortKey } from "@/lib/types";

export const INSTAGRAM_URL = raw.instagramUrl;

export const PROPERTIES = raw.properties as unknown as Property[];

export const propertyBySlug = (slug: string): Property | undefined =>
  PROPERTIES.find((p) => p.slug === slug);

export const featuredProperties = (): Property[] =>
  PROPERTIES.filter((p) => p.featured);

/** Price lookup shared by compare + saved pages. */
export const priceOf = (slug: string): number =>
  propertyBySlug(slug)?.price ?? Number.MAX_SAFE_INTEGER;

export interface PropertyQuery {
  text?: string;
  cities?: string[];
  types?: string[];
  bedrooms?: number[]; // includes "4+" when Number.MAX_SAFE_INTEGER is used
  statuses?: string[];
  possession?: string[];
  minPrice?: number;
  maxPrice?: number;
  sort?: SortKey;
}

export const CITY_OPTIONS = [...new Set(PROPERTIES.map((p) => p.city))];
export const TYPE_OPTIONS = [...new Set(PROPERTIES.map((p) => p.type))];

export const POSSESSION_OPTIONS = [
  "Immediate",
  "2026",
  "2027+",
] as const;

export function possessionBucket(p: Property): string {
  if (p.possession.startsWith("Immediate")) return "Immediate";
  const year = parseInt(p.possession, 10);
  if (Number.isNaN(year)) return "Immediate";
  if (year <= 2026) return "2026";
  return "2027+";
}

const PRICE_STEPS = [
  3_000_000, 5_000_000, 7_500_000, 10_000_000, 15_000_000, 25_000_000,
  50_000_000,
];

export const PRICE_MIN = 0;
export const PRICE_MAX = 50_000_000;

export function priceRangeLabel(v: number): string {
  if (v >= PRICE_MAX) return "₹5 Cr+";
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2).replace(/\.00$/, "")} Cr`;
  return `₹${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")} L`;
}

/** Pure query engine — easy to unit-test, trivially portable to the server. */
export function queryProperties(q: PropertyQuery = {}): Property[] {
  const text = q.text?.trim().toLowerCase();
  let out = PROPERTIES.filter((p) => {
    if (
      text &&
      ![
        p.name,
        p.location,
        p.city,
        p.type,
        p.config,
        p.shortDescription,
      ]
        .join(" ")
        .toLowerCase()
        .includes(text)
    )
      return false;
    if (q.cities?.length && !q.cities.includes(p.city)) return false;
    if (q.types?.length && !q.types.includes(p.type)) return false;
    if (q.statuses?.length && !q.statuses.includes(p.status)) return false;
    if (q.possession?.length && !q.possession.includes(possessionBucket(p)))
      return false;
    if (q.bedrooms?.length) {
      const b = p.bedrooms;
      const ok = q.bedrooms.some((want) =>
        want >= 4 ? b >= 4 : b === want,
      );
      if (!ok) return false;
    }
    if (q.minPrice !== undefined && p.price < q.minPrice) return false;
    if (q.maxPrice !== undefined && p.price > q.maxPrice) return false;
    return true;
  });

  const sort = q.sort ?? "featured";
  out = [...out].sort((a, b) => {
    switch (sort) {
      case "newest":
        return Number(b.isNew) - Number(a.isNew) || a.name.localeCompare(b.name);
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      default:
        return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
    }
  });
  return out;
}

export { PRICE_STEPS };
