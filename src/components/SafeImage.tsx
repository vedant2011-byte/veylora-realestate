"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Artwork image with graceful degradation: if the SVG fails to load,
 * a branded placeholder takes its place — never a broken-image glyph.
 */
export default function SafeImage({
  src,
  alt,
  className,
  eager = false,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
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

  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
