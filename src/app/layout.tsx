import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import PerfProbe from "@/components/PerfProbe";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://veylora.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Veylora — Find a place that feels like home",
    template: "%s — Veylora",
  },
  description:
    "Veylora curates thoughtfully selected homes and properties across India — apartments, villas, row houses and plots — for the way you want to live.",
  keywords: [
    "real estate",
    "homes in India",
    "apartments",
    "villas",
    "plots",
    "property discovery",
    "Nashik properties",
    "Pune properties",
  ],
  openGraph: {
    type: "website",
    siteName: "Veylora",
    title: "Veylora — Find a place that feels like home",
    description:
      "Thoughtfully selected homes and properties for the way you want to live.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Veylora — find a place that feels like home" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veylora — Find a place that feels like home",
    description:
      "Thoughtfully selected homes and properties for the way you want to live.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#100e0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sora.variable} ${jakarta.variable}`}>
      <body>
        {children}
        {/* Dev/diagnostic-only FPS HUD — inert unless the URL contains ?perf. */}
        <PerfProbe />
      </body>
    </html>
  );
}
