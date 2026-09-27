import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteShell from "@/components/SiteShell";
import PropertyGallery from "@/components/PropertyGallery";
import EnquiryForm from "@/components/EnquiryForm";
import FavoriteButton from "@/components/FavoriteButton";
import CompareToggle from "@/components/CompareToggle";
import { StatusPill } from "@/components/PropertyCard";
import { PROPERTIES, propertyBySlug } from "@/data/properties";
import { Reveal } from "@/lib/Reveal";

export function generateStaticParams() {
  return PROPERTIES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = propertyBySlug(slug);
  if (!p) return { title: "Property not found" };
  return {
    title: `${p.name} — ${p.config} in ${p.location}`,
    description: p.shortDescription,
    openGraph: { title: `${p.name} — Veylora`, description: p.shortDescription },
  };
}

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = propertyBySlug(slug);
  if (!p) notFound();

  const facts: Array<[string, string]> = [
    ["Configuration", p.config],
    ["Type", p.type],
    ["Built-up area", `${p.area.toLocaleString("en-IN")} sq.ft.`],
    ["Bedrooms", p.bedrooms > 0 ? String(p.bedrooms) : "—"],
    ["Bathrooms", p.bathrooms > 0 ? String(p.bathrooms) : "—"],
    ["Facing", p.facing],
    ["Furnishing", p.furnishing],
    ["Rate", p.priceNote],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: p.name,
    description: p.shortDescription,
    address: {
      "@type": "PostalAddress",
      addressLocality: p.city,
      addressRegion: p.state,
      addressCountry: "IN",
    },
  };

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-paper-deep/60 pb-10 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-[12px] text-ink-mute">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link
                  href="/properties"
                  className="-my-2 -ml-2 inline-flex min-h-11 items-center px-2 hover:text-ink"
                >
                  Properties
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">{p.name}</li>
            </ol>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={p.status} />
                {p.isNew && (
                  <span className="rounded-full bg-night px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper">
                    New
                  </span>
                )}
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
                {p.name}
              </h1>
              <p className="mt-2 text-[15px] text-ink-mute">
                {p.location}, {p.city} — {p.tagline}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="font-display text-3xl font-semibold tracking-tight text-amber-deep md:text-4xl">{p.priceLabel}</p>
              <p className="mt-1 text-[13px] text-ink-mute">{p.priceNote} · {p.possession}</p>
              <div className="mt-4 flex gap-2.5 md:justify-end">
                <FavoriteButton slug={p.slug} variant="chip" />
                <CompareToggle slug={p.slug} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper pb-28 pt-8 md:pb-36">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 md:px-8 lg:grid-cols-[1.55fr_1fr]">
          {/* ── Left column ── */}
          <div className="space-y-14">
            <PropertyGallery photos={p.photos} name={p.name} />

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight">The story of this home</h2>
              <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-ink-soft">{p.description}</p>
              <ul className="mt-6 space-y-3">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-3 text-[15px] text-ink-soft">
                    <span className="mt-2 block h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Facts & figures</h2>
              <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-4">
                {facts.map(([k, v]) => (
                  <div key={k} className="bg-paper p-4">
                    <dt className="text-[10.5px] uppercase tracking-[0.18em] text-ink-mute">{k}</dt>
                    <dd className="mt-1.5 text-[15px] font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Amenities</h2>
              <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 border-b border-ink/8 pb-3 text-[14.5px] text-ink-soft">
                    <CheckGlyph />
                    {a}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Specifications</h2>
              <div className="mt-5 overflow-hidden rounded-2xl border border-ink/10">
                {p.specifications.map(([k, v], i) => (
                  <div key={k} className={`grid gap-1 p-4 sm:grid-cols-[180px_1fr] sm:gap-6 ${i % 2 ? "bg-paper-deep/50" : "bg-paper"}`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-mute">{k}</p>
                    <p className="text-[14.5px] text-ink-soft">{v}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal>
              <h2 className="font-display text-2xl font-semibold tracking-tight">What’s around</h2>
              <ul className="mt-5 space-y-0">
                {p.nearby.map(([place, dist]) => (
                  <li key={place} className="flex items-center justify-between border-b border-ink/8 py-3.5 text-[14.5px]">
                    <span className="text-ink-soft">{place}</span>
                    <span className="font-medium text-ink-mute">{dist}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* ── Right column: sticky enquiry card ── */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Reveal className="rounded-2xl border border-ink/10 bg-paper-deep/70 p-6 md:p-7">
              <h2 className="font-display text-xl font-semibold tracking-tight">Interested in {p.name}?</h2>
              <p className="mt-1.5 text-[13px] text-ink-mute">
                Possession: {p.possession} · Status: {p.status}
              </p>
              <div className="mt-5">
                <EnquiryForm propertyLabel={p.name} />
              </div>
            </Reveal>
          </aside>
        </div>
      </section>

      {/* Sticky mobile action bar — thumb-friendly */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur-md lg:hidden [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{p.name}</p>
            <p className="text-[12px] text-amber-deep">{p.priceLabel}</p>
          </div>
          <a
            href={`tel:+910000000000`}
            className="inline-flex h-12 items-center rounded-full border border-ink/25 px-5 text-[12px] font-semibold uppercase tracking-[0.16em]"
          >
            Contact
          </a>
          <a
            href={`https://wa.me/910000000000?text=${encodeURIComponent(`Hi Veylora, I'm interested in ${p.name} (${p.location}).`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center rounded-full bg-amber px-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-night"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </SiteShell>
  );
}

function CheckGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0 text-sage-deep" aria-hidden>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}
