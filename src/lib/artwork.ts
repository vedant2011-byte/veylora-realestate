/** Property photo helpers — real photography from the data layer. */
import { PROPERTIES } from "@/data/properties";

export const propertyPhotos = (slug: string): string[] =>
  PROPERTIES.find((p) => p.slug === slug)?.photos ?? [];

export const heroPhoto = (slug: string): string => propertyPhotos(slug)[0] ?? "";
