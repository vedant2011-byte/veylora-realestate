import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import PropertyGrid from "@/components/PropertyGrid";
import { Reveal } from "@/lib/Reveal";
import { CITY_OPTIONS, PROPERTIES } from "@/data/properties";

export const metadata: Metadata = {
  title: "All Properties",
  description:
    "Browse the full Veylora demo catalogue — 16 fictional homes across apartments, villas, row houses, independent houses, plots and penthouses.",
};

export default function PropertiesPage() {
  return (
    <SiteShell>
      <section className="bg-paper-deep/70 pb-14 pt-28 md:pb-16 md:pt-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">The catalogue</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Every home, one view.
          </h1>
          <p className="mt-4 max-w-md text-[15px] text-ink-soft">
            {PROPERTIES.length} fictional listings across {CITY_OPTIONS.join(" and ")}.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex h-12 items-center rounded-full bg-ink px-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-amber-deep"
            >
              Open filters
            </Link>
            <Link
              href="/compare"
              className="inline-flex h-12 items-center rounded-full border border-ink/25 px-6 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-paper"
            >
              Compare saved picks
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-paper py-14 md:py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          {CITY_OPTIONS.map((city) => (
            <div key={city} className="mb-14 last:mb-0">
              <Reveal className="mb-7 flex items-baseline justify-between border-b border-ink/10 pb-4">
                <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{city}</h2>
                <span className="text-sm text-ink-mute">
                  {PROPERTIES.filter((p) => p.city === city).length} homes
                </span>
              </Reveal>
              <PropertyGrid properties={PROPERTIES.filter((p) => p.city === city)} />
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
