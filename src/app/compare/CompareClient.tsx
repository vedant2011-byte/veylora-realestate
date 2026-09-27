"use client";

import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import SafeImage from "@/components/SafeImage";
import { PROPERTIES, propertyBySlug } from "@/data/properties";
import { MAX_COMPARE_SLOTS, clearCompare, useCompare } from "@/lib/favorites";

const ROWS: Array<{ label: string; get: (p: (typeof PROPERTIES)[number]) => string }> = [
  { label: "Price", get: (p) => `${p.priceLabel} · ${p.priceNote}` },
  { label: "Area", get: (p) => `${p.area.toLocaleString("en-IN")} sq.ft.` },
  { label: "Configuration", get: (p) => p.config },
  { label: "Bedrooms", get: (p) => (p.bedrooms > 0 ? String(p.bedrooms) : "—") },
  { label: "Bathrooms", get: (p) => (p.bathrooms > 0 ? String(p.bathrooms) : "—") },
  { label: "Type", get: (p) => p.type },
  { label: "Location", get: (p) => `${p.location}, ${p.city}` },
  { label: "Status", get: (p) => p.status },
  { label: "Possession", get: (p) => p.possession },
  { label: "Furnishing", get: (p) => p.furnishing },
];

export default function CompareClient() {
  const compare = useCompare();
  const items = compare.map((s) => propertyBySlug(s)).filter((p): p is (typeof PROPERTIES)[number] => Boolean(p));
  const slots = MAX_COMPARE_SLOTS;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
        <div className="rounded-3xl border border-dashed border-ink/20 bg-paper-deep/50 px-6 py-20 text-center">
          <CompareGlyph />
          <p className="mt-4 font-display text-2xl font-semibold tracking-tight">Nothing to weigh yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-mute">
            Tap “Compare” on any property card — up to {slots} homes sit side by side here, same facts, same order.
          </p>
          <Link
            href="/explore"
            className="mt-8 inline-flex h-13 items-center rounded-full bg-amber px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-night transition-transform hover:scale-[1.02]"
          >
            Browse properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ink-mute">
          {items.length} of {slots} slots used
        </p>
        <button
          type="button"
          onClick={clearCompare}
          className="inline-flex h-11 items-center rounded-full border border-ink/20 px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute transition-colors hover:border-ink/45 hover:text-ink"
        >
          Clear comparison
        </button>
      </div>

      <div className="no-scrollbar snap-x-rail mt-6 flex gap-5 overflow-x-auto pb-4 md:mt-8">
        <div className="hidden w-40 shrink-0 md:block">
          <div className="h-[188px]" aria-hidden />
          {ROWS.map((r) => (
            <div key={r.label} className="flex h-12 items-center text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-mute">
              {r.label}
            </div>
          ))}
        </div>

        {items.map((p) => (
          <div key={p.slug} className="w-[86vw] shrink-0 snap-start sm:w-[420px] md:w-auto md:min-w-[280px] md:flex-1">
            <Link href={`/properties/${p.slug}`} className="block rounded-2xl border border-ink/10 bg-white/60 p-4">
              <SafeImage src={p.photos[0]} alt="" sizes="180px" className="h-24 w-full rounded-xl object-cover" />
              <h2 className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight">{p.name}</h2>
            </Link>

            <dl className="mt-3 space-y-2 md:hidden">
              {ROWS.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 rounded-xl bg-white/60 px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-mute">{r.label}</dt>
                  <dd className="text-right text-[13.5px] font-medium">{r.get(p)}</dd>
                </div>
              ))}
            </dl>

            <dl className="mt-0 hidden md:block">
              {ROWS.map((r) => (
                <div key={r.label} className="flex h-12 items-center border-b border-ink/8 text-[13.5px]">
                  {r.get(p)}
                </div>
              ))}
            </dl>
          </div>
        ))}

        {items.length < slots && (
          <div className="hidden w-[280px] shrink-0 md:block">
            <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-ink/25 p-6 text-center">
              <p className="text-sm text-ink-mute">Slot {items.length + 1} is open.</p>
              <Link
                href="/explore"
                className="mt-4 inline-flex h-11 items-center rounded-full border border-ink/25 px-5 text-[11px] font-semibold uppercase tracking-[0.16em] hover:bg-ink hover:text-paper"
              >
                Add a home
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight">Keep shopping</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTIES.filter((p) => !compare.includes(p.slug))
            .slice(0, 3)
            .map((p) => (
              <PropertyCard key={p.slug} p={p} />
            ))}
        </div>
      </div>
    </div>
  );
}

function CompareGlyph() {
  return (
    <svg className="mx-auto text-ink-mute" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M7 4v16M17 4v16M3 8l4-4 4 4M21 16l-4 4-4-4" />
    </svg>
  );
}
