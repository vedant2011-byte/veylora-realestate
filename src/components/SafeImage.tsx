"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Property image with graceful degradation and responsive delivery.
 *
 * - Unsplash CDN sources get a width-based srcSet + sizes, so phones fetch
 *   ~480–760px files for card slots instead of the desktop 1200px one.
 * - Any other source passes through untouched.
 * - A failed image becomes a branded placeholder — never a broken glyph.
 */

const CDN = "images.unsplash.com";
const WIDTHS = [480, 760, 1080, 1400, 1920];

function isCdn(src: string): boolean {
  return src.includes(CDN);
}

function variant(src: string, w: number): string {
  try {
    const u = new URL(src);
    u.searchParams.set("w", String(w));
    if (!u.searchParams.has("q")) u.searchParams.set("q", "75");
    u.searchParams.set("auto", "format");
    if (!u.searchParams.has("fit")) u.searchParams.set("fit", "crop");
    return u.toString();
  } catch {
    return src;
  }
}

function buildSrcSet(src: string): string | undefined {
  if (!isCdn(src)) return undefined;
  return WIDTHS.map((w) => `${variant(src, w)} ${w}w`).join(", ");
}

export default function SafeImage({
  src,
  alt,
  className,
  eager = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw",
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  /** Layout-based hint so the browser picks the right srcSet candidate. */
  sizes?: string;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn("flex items-center justify-center bg-paper-dim", className)}
        style={style}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6f6455" strokeWidth="1.4" aria-hidden>
          <path d="M3 17l5-5 4 4 3-3 6 6M4 21h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1z" />
          <circle cx="9" cy="8.5" r="1.6" />
        </svg>
      </div>
    );
  }

  /* Eager images get one exact src — React 19 preloads fetchPriority=high
     imgs by URL, and a srcSet there can preload a candidate the browser
     then ignores (wasted download + console warning). Lazy images keep
     the full responsive srcSet. */
  const eagerSrc = isCdn(src) ? variant(src, 1080) : src;
  return (
    <img
      src={eager ? eagerSrc : src}
      srcSet={eager ? undefined : buildSrcSet(src)}
      sizes={eager ? undefined : sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      {...(eager ? { fetchPriority: "high" as const } : {})}
      decoding="async"
      draggable={false}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
