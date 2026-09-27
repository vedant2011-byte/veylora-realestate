import Link from "next/link";
import type { Property } from "@/lib/types";
import FavoriteButton from "./FavoriteButton";
import CompareToggle from "./CompareToggle";
import SafeImage from "./SafeImage";
import { inr } from "@/lib/utils";

export function StatusPill({ status }: { status: Property["status"] }) {
  const tone =
    status === "Ready to Move"
      ? "bg-sage/20 text-sage-deep"
      : status === "New Launch"
        ? "bg-amber/20 text-amber-deep"
        : "bg-clay/15 text-clay";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tone}`}>
      {status}
    </span>
  );
}

export default function PropertyCard({ p, eager = false }: { p: Property; eager?: boolean }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white/60 transition-shadow duration-500 hover:shadow-[0_24px_60px_-32px_rgba(23,20,16,0.35)]">
      <Link
        href={`/properties/${p.slug}`}
        className="relative block aspect-[4/3] overflow-hidden"
        aria-label={`View ${p.name}`}
      >
        <SafeImage
          src={p.photos[0]}
          alt={`${p.name} — ${p.config} in ${p.location}`}
          eager={eager}
          className="img-zoom h-full w-full object-cover"
        />
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <StatusPill status={p.status} />
          {p.isNew && (
            <span className="rounded-full bg-night/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper">
              New
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 rounded-full bg-night/70 px-3.5 py-1.5 text-[12px] font-semibold tracking-wide text-paper backdrop-blur-sm">
          {p.priceLabel}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
              <Link href={`/properties/${p.slug}`} className="transition-colors hover:text-amber-deep">
                {p.name}
              </Link>
            </h3>
            <p className="mt-1 text-[13px] text-ink-mute">
              {p.location} · {p.city}
            </p>
          </div>
          <FavoriteButton slug={p.slug} variant="icon" />
        </div>

        <p className="mt-3 text-sm font-medium text-ink-soft">{p.config}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-mute">
          {p.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <BedGlyph /> {p.bedrooms} Beds
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <AreaGlyph /> {p.area.toLocaleString("en-IN")} sq.ft.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BathGlyph /> {p.bathrooms > 0 ? `${p.bathrooms} Baths` : "—"}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-ink/10 pt-4">
          <CompareToggle slug={p.slug} />
          <Link
            href={`/properties/${p.slug}`}
            className="inline-flex h-11 items-center text-[12px] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:text-amber-deep"
          >
            View Property
            <span aria-hidden className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function BedGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2m18-2v2M6 10V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
    </svg>
  );
}
function BathGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-2zM7 12V5a2 2 0 0 1 4 0M8 21l-1 1m9-1 1 1" />
    </svg>
  );
}
function AreaGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9h5V4M20 15h-5v5" />
    </svg>
  );
}

export { inr };
