"use client";

import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import { PROPERTIES } from "@/data/properties";
import { useFavorites } from "@/lib/favorites";

export default function SavedClient() {
  const favorites = useFavorites();
  const saved = PROPERTIES.filter((p) => favorites.includes(p.slug));

  if (saved.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-night px-6 py-24 text-center text-paper">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "radial-gradient(50% 60% at 50% 0%, rgba(217,142,50,0.2), transparent 65%)" }}
          />
          <div className="relative">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-paper/25">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M12 21s-7.5-4.9-9.6-9.2C.8 8.4 2.7 4.9 6.2 4.9c2.2 0 3.9 1.2 4.8 3 0.9-1.8 2.6-3 4.8-3 3.5 0 5.4 3.5 3.8 6.9C17.5 16.1 12 21 12 21z" />
              </svg>
            </span>
            <h2 className="mt-7 font-display text-3xl font-semibold tracking-tight md:text-4xl">Nothing saved — yet.</h2>
            <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-paper/60">
              The heart on any property card keeps it here, on this device. No account,
              no cloud, no noise — just your shortlist.
            </p>
            <Link
              href="/explore"
              className="mt-9 inline-flex h-13 items-center rounded-full bg-amber px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform hover:scale-[1.02]"
            >
              Find a home worth saving
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
      <p className="text-sm text-ink-mute" aria-live="polite">
        {saved.length} {saved.length === 1 ? "home" : "homes"} on your shelf · stored on this device only
      </p>
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map((p) => (
          <PropertyCard key={p.slug} p={p} />
        ))}
      </div>

      {saved.length >= 2 && (
        <div className="mt-12 rounded-2xl border border-ink/10 bg-paper-deep/60 p-6 text-center md:p-8">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {saved.length} saved — time to weigh them?
          </h2>
          <Link
            href="/compare"
            className="mt-5 inline-flex h-12 items-center rounded-full bg-ink px-7 text-[12px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-amber-deep"
          >
            Open compare
          </Link>
        </div>
      )}
    </div>
  );
}
