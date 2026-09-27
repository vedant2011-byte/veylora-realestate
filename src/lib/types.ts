/**
 * Veylora domain types. The demo catalogue is the single source of truth —
 * swap src/data/properties.mjs for an API response and nothing else changes.
 */
export const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Row House",
  "Independent House",
  "Plot",
  "Penthouse",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = [
  "Ready to Move",
  "Under Construction",
  "New Launch",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export type PossessionBucket = "Immediate" | "2026" | "2027+";

export interface Property {
  slug: string;
  name: string;
  location: string;
  city: string;
  state: string;
  type: PropertyType;
  config: string;
  price: number;
  priceLabel: string;
  priceNote: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  floors: number;
  status: PropertyStatus;
  possession: string;
  facing: string;
  furnishing: string;
  rating: number;
  featured: boolean;
  isNew: boolean;
  artScene: string;
  /** Real photography (Unsplash, free-to-use) — hero / second / third. */
  photos: string[];
  photoCredit: string;
  tagline: string;
  description: string;
  shortDescription: string;
  highlights: string[];
  amenities: string[];
  specifications: [string, string][];
  nearby: [string, string][];
}

export type SortKey = "featured" | "newest" | "price-asc" | "price-desc";
