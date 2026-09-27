/** Property photo helpers — real photography from the data layer. */
import { PROPERTIES } from "@/data/properties";

export const propertyPhotos = (slug: string): string[] =>
  PROPERTIES.find((p) => p.slug === slug)?.photos ?? [];

export const heroPhoto = (slug: string): string => propertyPhotos(slug)[0] ?? "";

/** Small variants of every hero photo — prefetched during idle time. */
export const ARTWORK_PRELOAD: string[] = PROPERTIES.map((p) => p.photos[0])
  .filter(Boolean)
  .map((src) => src.replace("w=1200", "w=640&q=60"));
