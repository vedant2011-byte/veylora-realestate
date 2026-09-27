"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import SafeImage from "./SafeImage";

/**
 * Gallery over the property's real photos. Swipe + buttons + thumbnails,
 * 44px+ targets, keyboard navigation, graceful fallback if a photo fails.
 */
export default function PropertyGallery({
  photos,
  name,
}: {
  photos: string[];
  name: string;
}) {
  const slides = photos.length ? photos : [""];
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (next: number) => setIndex(((next % slides.length) + slides.length) % slides.length),
    [slides.length],
  );

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-ink/10 bg-paper-deep"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${name} gallery`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 42) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-paper-deep">
        {slides.map((src, i) => (
          <div
            key={src || i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <SafeImage
              src={src}
              alt={`${name} — photo ${i + 1} of ${slides.length}`}
              eager={i === 0}
              sizes="(min-width: 1024px) 900px, 92vw"
              className="h-full w-full object-cover"
            />
          </div>
        ))}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-ink shadow-sm backdrop-blur transition-colors hover:bg-paper"
            >
              <span aria-hidden>‹</span>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-paper/85 text-ink shadow-sm backdrop-blur transition-colors hover:bg-paper"
            >
              <span aria-hidden>›</span>
            </button>
          </>
        )}

        <span className="absolute bottom-4 right-4 rounded-full bg-night/70 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-paper tabular-nums">
          {index + 1} / {slides.length}
        </span>
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 p-3">
          {slides.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-14 flex-1 overflow-hidden rounded-lg border-2 transition-colors",
                i === index ? "border-amber" : "border-transparent opacity-65 hover:opacity-100",
              )}
            >
              <SafeImage src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
