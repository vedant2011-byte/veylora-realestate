import type { MetadataRoute } from "next";
import { PROPERTIES } from "@/data/properties";

const BASE = "https://veylora.example";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/explore", "/properties", "/locations", "/process", "/about", "/compare", "/saved", "/contact"].map(
    (path) => ({
      url: `${BASE}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const propertyRoutes = PROPERTIES.map((p) => ({
    url: `${BASE}/properties/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...propertyRoutes];
}
