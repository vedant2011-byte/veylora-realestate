import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Veylora — Find a place that feels like home",
    short_name: "Veylora",
    description:
      "Thoughtfully selected homes and properties for the way you want to live.",
    start_url: "/",
    display: "standalone",
    background_color: "#100e0b",
    theme_color: "#100e0b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
