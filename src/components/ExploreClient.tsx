"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PropertyGrid from "./PropertyGrid";
import {
  CITY_OPTIONS,
  POSSESSION_OPTIONS,
  TYPE_OPTIONS,
  queryProperties,
  type PropertyQuery,
} from "@/data/properties";
import type { SortKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price ↑" },
  { key: "price-desc", label: "Price ↓" },
];

const STATUS_OPTIONS = ["Ready to Move", "Under Construction", "New Launch"];
const BED_OPTIONS = [2, 3, 4];
const PRICE_STEPS = [0, 5_000_000, 10_000_000, 20_000_000, 50_000_000];

function priceLabel(v: number) {
  if (v >= 50_000_000) return "₹5 Cr+";
  if (v >= 10_000_000) return `₹${v / 10_000_000} Cr`;
  if (v === 0) return "Any";
  return `₹${v / 100_000} L`;
}

export default function ExploreClient() {
  const router = useRouter();
  const params = useSearchParams();

  /* ── state, seeded from the URL ── */
  const text = params.get("q") ?? "";
  const typeParam = params.get("type") ?? "";
  const sort = (params.get("sort") as SortKey) ?? "featured";
  const maxPrice = Number(params.get("max") ?? 0);
  const beds = Number(params.get("beds") ?? 0);

  const [query, setQuery] = useState(text);
  const [cities, setCities] = useState<string[]>(params.get("city")?.split(",").filter(Boolean) ?? []);
  const [statuses, setStatuses] = useState<string[]>(params.get("status")?.split(",").filter(Boolean) ?? []);
  const [possession, setPossession] = useState<string[]>(params.get("poss")?.split(",").filter(Boolean) ?? []);

  const push = useCallback(
    (mut: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(params.toString());
      mut(p);
      router.replace(p.size ? `/explore?${p}` : "/explore", { scroll: false });
    },
    [params, router],
  );

  const results = useMemo(
    () =>
      queryProperties({
        text: query,
        types: typeParam ? [typeParam] : undefined,
        cities,
        statuses,
        possession,
        bedrooms: beds ? [beds >= 4 ? Number.MAX_SAFE_INTEGER : beds] : undefined,
        maxPrice: maxPrice || undefined,
        sort,
      } satisfies PropertyQuery),
    [query, typeParam, cities, statuses, possession, beds, maxPrice, sort],
  );

  const activeChips = useMemo(() => {
    const chips: Array<{ label: string; clear: () => void }> = [];
    if (query) chips.push({ label: `“${query}”`, clear: () => setQuery("") });
    if (typeParam) chips.push({ label: typeParam, clear: () => push((p) => p.delete("type")) });
    cities.forEach((c) =>
      chips.push({ label: c, clear: () => setCities((cur) => cur.filter((x) => x !== c)) }),
    );
    statuses.forEach((s) =>
      chips.push({ label: s, clear: () => setStatuses((cur) => cur.filter((x) => x !== s)) }),
    );
    possession.forEach((s) =>
      chips.push({ label: `Possession ${s}`, clear: () => setPossession((cur) => cur.filter((x) => x !== s)) }),
    );
    if (beds) chips.push({ label: `${beds}+ Beds`, clear: () => push((p) => p.delete("beds")) });
    if (maxPrice) chips.push({ label: `≤ ${priceLabel(maxPrice)}`, clear: () => push((p) => p.delete("max")) });
    return chips;
  }, [query, typeParam, cities, statuses, possession, beds, maxPrice, push]);

  const chipClearAll = () => {
    setQuery("");
    setCities([]);
    setStatuses([]);
    setPossession([]);
    router.replace("/explore", { scroll: false });
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
      {/* Search + sort row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <SearchGlyph />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, area, city…"
            aria-label="Search properties"
            className="h-13 w-full rounded-full border border-ink/20 bg-white/70 py-4 pl-12 pr-5 text-[15px] outline-none transition-colors placeholder:text-ink-mute/70 focus:border-amber-deep"
          />
        </div>
        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1" role="group" aria-label="Sort results">
          <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.2em] text-ink-mute md:block">Sort</span>
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => push((p) => (s.key === "featured" ? p.delete("sort") : p.set("sort", s.key)))}
              aria-pressed={sort === s.key}
              className={cn(
                "h-11 shrink-0 rounded-full border px-5 text-[12px] font-semibold tracking-wide transition-colors",
                sort === s.key
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/20 text-ink-soft hover:border-ink/45",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter rails (horizontal scroll on touch) */}
      <div className="mt-6 space-y-3">
        <FilterRail label="Location" options={CITY_OPTIONS} selected={cities} onToggle={(v) => setCities((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))} />
        <FilterRail
          label="Type"
          options={TYPE_OPTIONS}
          selected={typeParam ? [typeParam] : []}
          onToggle={(v) => push((p) => (p.get("type") === v ? p.delete("type") : p.set("type", v)))}
        />
        <FilterRail label="Status" options={STATUS_OPTIONS} selected={statuses} onToggle={(v) => setStatuses((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))} />
        <FilterRail label="Possession" options={[...POSSESSION_OPTIONS]} selected={possession} onToggle={(v) => setPossession((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]))} />
        <FilterRail
          label="Bedrooms"
          options={BED_OPTIONS.map((b) => `${b}+`)}
          selected={beds ? [`${Math.min(beds, 4)}+`] : []}
          onToggle={(v) => push((p) => (p.get("beds") === v.replace("+", "") ? p.delete("beds") : p.set("beds", v.replace("+", ""))))}
        />
        <FilterRail
          label="Price"
          options={PRICE_STEPS.slice(1).map(priceLabel)}
          selected={maxPrice ? [priceLabel(maxPrice)] : []}
          onToggle={(v) => {
            const step = PRICE_STEPS.slice(1).find((s) => priceLabel(s) === v) ?? 0;
            push((p) => (maxPrice === step ? p.delete("max") : p.set("max", String(step))));
          }}
        />
      </div>

      {/* Active chips */}
      {activeChips.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {activeChips.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.clear}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-ink/8 px-3.5 text-[12px] font-medium text-ink-soft transition-colors hover:bg-ink/15"
            >
              {c.label}
              <span aria-hidden>✕</span>
            </button>
          ))}
          <button
            type="button"
            onClick={chipClearAll}
            className="ml-1 inline-flex h-9 items-center px-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-amber-deep hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Result count */}
      <p className="mt-8 text-sm text-ink-mute" aria-live="polite">
        {results.length} {results.length === 1 ? "home" : "homes"} found
      </p>

      {/* Results */}
      <div className="mt-6">
        {results.length ? (
          <PropertyGrid properties={results} columns={3} />
        ) : (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-paper-deep/60 px-6 py-20 text-center">
            <p className="font-display text-2xl font-semibold tracking-tight">Nothing matches — yet.</p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-mute">
              Loosen a filter or clear everything. The right home might be one step away from this exact combination.
            </p>
            <button
              type="button"
              onClick={chipClearAll}
              className="mt-7 inline-flex h-12 items-center rounded-full bg-ink px-7 text-[12px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-amber-deep"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterRail({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-[0.2em] text-ink-mute">{label}</span>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={active}
              className={cn(
                "h-11 shrink-0 rounded-full border px-4 text-[12.5px] font-medium transition-colors",
                active
                  ? "border-amber-deep bg-amber/20 text-amber-deep"
                  : "border-ink/15 bg-white/50 text-ink-soft hover:border-ink/40",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </svg>
  );
}
