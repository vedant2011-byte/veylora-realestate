import Link from "next/link";
import HeroProvider from "@/components/HeroProvider";
import SiteShell from "@/components/SiteShell";
import PropertyGrid from "@/components/PropertyGrid";
import { Reveal } from "@/lib/Reveal";
import { featuredProperties } from "@/data/properties";
import { PROPERTY_TYPES } from "@/lib/types";

export default function HomePage() {
  const featured = featuredProperties().slice(0, 3);

  return (
    <SiteShell>
      {/* 01 — Cinematic hero (loader + 150-frame film) */}
      <HeroProvider />

      {/* 02 — Featured properties */}
      <section id="featured" aria-labelledby="featured-heading" className="bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">02 — Featured</p>
              <h2 id="featured-heading" className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight md:text-5xl">
                Homes we would shortlist ourselves.
              </h2>
            </div>
            <Link
              href="/explore"
              className="inline-flex h-12 items-center rounded-full border border-ink/25 px-6 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-paper"
            >
              View all
            </Link>
          </Reveal>

          <Reveal delay={120} className="mt-10 md:mt-14">
            <PropertyGrid properties={featured} />
          </Reveal>
        </div>
      </section>

      {/* 03 — Why choose us (editorial split, unlike any card section) */}
      <section aria-labelledby="why-heading" className="border-y border-ink/10 bg-paper-deep py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:grid-cols-2 md:gap-20 md:px-8">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">03 — Why Veylora</p>
            <h2 id="why-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Built on clarity, not commission pressure.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Every listing here is curated the way a friend would shortlist for you —
              honest specifications, real possession timelines and pricing laid out
              before anyone asks you to enquire.
            </p>
          </Reveal>
          <ul className="space-y-0">
            {[
              ["Curated, not crowded", "A short catalogue of homes that pass a simple test: would we visit twice?"],
              ["Numbers first", "Price, area and possession on every card — no hidden-glyph games."],
              ["Demo-honest", "This is a prototype with fictional listings, clearly labelled. The experience is real."],
            ].map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 110} className="flex gap-5 border-t border-ink/10 py-6 first:border-t-0 md:py-7">
                <span className="font-display text-sm font-semibold text-amber-deep">0{i + 1}</span>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{t}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">{d}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 04 — Property categories (each with its own visual identity) */}
      <section aria-labelledby="types-heading" className="bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">04 — Categories</p>
            <h2 id="types-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
              Five ways to live.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-4 md:grid-cols-6 md:grid-rows-2">
            {[
              { type: "Apartment", note: "Lock-and-leave convenience", span: "md:col-span-3 md:row-span-2 aspect-[4/3] md:aspect-auto", tint: "bg-ink text-paper" },
              { type: "Villa", note: "Room to grow, walls of glass", span: "md:col-span-3 aspect-[4/3]", tint: "bg-paper-deep" },
              { type: "Row House", note: "A front door of your own", span: "md:col-span-2 aspect-[4/3]", tint: "bg-clay/15" },
              { type: "Independent House", note: "Ground your family stands on", span: "md:col-span-2 aspect-[4/3]", tint: "bg-sage/20" },
              { type: "Penthouse", note: "The skyline as a backyard", span: "md:col-span-2 aspect-[4/3]", tint: "bg-amber/20" },
            ].map((c, i) => (
              <Reveal key={c.type} delay={i * 80} className={`${c.span}`}>
                <Link
                  href={`/explore?type=${encodeURIComponent(c.type)}`}
                  className={`group flex h-full flex-col justify-between rounded-2xl border border-ink/10 p-6 transition-transform duration-500 hover:-translate-y-1 md:p-7 ${c.tint}`}
                >
                  <span className="font-display text-xl font-semibold tracking-tight md:text-2xl">{c.type}</span>
                  <span className="mt-10 flex items-end justify-between">
                    <span className={`text-sm ${c.tint.includes("text-paper") ? "text-paper/60" : "text-ink-mute"}`}>{c.note}</span>
                    <span aria-hidden className="text-xl transition-transform duration-500 group-hover:translate-x-1.5">→</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
          <p className="sr-only">{PROPERTY_TYPES.join(", ")}</p>
        </div>
      </section>

      {/* 05 — Location / lifestyle marquee (a texture strip, not cards) */}
      <section aria-labelledby="lifestyle-heading" className="overflow-hidden border-y border-ink/10 bg-night py-14 md:py-16">
        <Reveal className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber">05 — Where we operate</p>
          <h2 id="lifestyle-heading" className="sr-only">Locations and lifestyle</h2>
        </Reveal>
        <div className="marquee-paused mt-8 overflow-hidden" aria-hidden>
          <div className="marquee-track flex w-max items-center gap-10 pr-10">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-10">
                {["Nashik", "Pune", "Gangapur Road", "Hinjawadi", "Koregaon Park", "Trimbak Belt", "Viman Nagar", "Wakad", "Panchavati"].map((city) => (
                  <span key={`${dup}-${city}`} className="flex items-center gap-10 font-display text-3xl font-light tracking-tight text-paper/85 md:text-5xl">
                    {city}
                    <span className="inline-block h-2 w-2 rounded-full bg-amber/80" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <Reveal className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 md:px-8">
          <p className="max-w-md text-sm leading-relaxed text-paper/55">
            Growth corridors and quiet lanes alike — chosen for schools, commute and
            the weekend. Demo information, clearly labelled.
          </p>
          <Link
            href="/locations"
            className="inline-flex h-12 items-center rounded-full border border-paper/30 px-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-paper hover:text-night"
          >
            Explore locations
          </Link>
        </Reveal>
      </section>

      {/* 06 — Process teaser (numbered strip leading to /process) */}
      <section aria-labelledby="process-heading" className="bg-paper py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">06 — Process</p>
              <h2 id="process-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                From first look to housewarming.
              </h2>
            </div>
            <Link
              href="/process"
              className="inline-flex h-12 items-center rounded-full border border-ink/25 px-6 text-[12px] font-semibold uppercase tracking-[0.18em] transition-colors hover:bg-ink hover:text-paper"
            >
              See how it works
            </Link>
          </Reveal>

          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {["Discover", "Shortlist", "Visit", "Evaluate", "Move In"].map((step, i) => (
              <Reveal as="li" key={step} delay={i * 90} className="relative border-t-2 border-ink/15 pt-5">
                <span className="font-display text-[13px] font-semibold tracking-[0.25em] text-amber-deep">
                  0{i + 1}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold tracking-tight">{step}</h3>
                <span aria-hidden className="mt-3 block h-px w-8 bg-amber" />
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 07 — Cinematic final CTA (dark, distinct from hero) */}
      <section aria-labelledby="cta-heading" className="grain relative overflow-hidden bg-ink py-24 text-paper md:py-32">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 80% at 70% 20%, rgba(217,142,50,0.16), transparent 60%), radial-gradient(50% 70% at 20% 90%, rgba(117,129,106,0.12), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-5 text-center md:px-8">
          <Reveal>
            <h2 id="cta-heading" className="font-display text-4xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
              YOUR NEXT ADDRESS
              <br />
              COULD BE HERE.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-paper/65">
              Explore properties designed around the way you want to live.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/explore"
                className="inline-flex h-13 min-w-48 items-center justify-center rounded-full bg-amber px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-night transition-transform duration-300 hover:scale-[1.03]"
              >
                Explore Properties
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-13 min-w-48 items-center justify-center rounded-full border border-paper/40 px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-paper hover:text-night"
              >
                Contact Us
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
