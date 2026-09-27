import Link from "next/link";
import { INSTAGRAM_URL } from "@/lib/utils";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Explore",
    links: [
      { href: "/explore", label: "Explore properties" },
      { href: "/properties", label: "All properties" },
      { href: "/compare", label: "Compare" },
      { href: "/saved", label: "Saved" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/process", label: "Our process" },
      { href: "/locations", label: "Locations" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-night text-paper">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/30 font-display text-base font-semibold">
                V
              </span>
              <span className="font-display text-lg font-semibold tracking-[0.22em]">VEYLORA</span>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-paper/55">
              Thoughtfully selected homes and properties for the way you want to live.
              A property discovery prototype — every listing is fictional demo content.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex h-12 items-center gap-3 rounded-full border border-paper/25 px-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-paper transition-colors hover:border-amber hover:text-amber"
            >
              <InstagramGlyph />
              Instagram
            </a>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-paper/40">{col.title}</h2>
              <ul className="mt-5 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="-ml-2 inline-flex min-h-11 items-center px-2 text-sm text-paper/70 transition-colors hover:text-paper"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-7 text-[12px] text-paper/40 sm:flex-row sm:items-center">
          <p>© 2026 Veylora. Demo prototype — properties are fictional.</p>
          <p className="min-h-11 flex items-center">
            Website crafted by{" "}
            <a
              href="https://blackgrid.design"
              target="_blank"
              rel="noopener noreferrer"
              className="-mx-2 inline-flex min-h-11 items-center px-2 font-medium text-paper/80 underline-offset-4 transition-colors hover:text-amber hover:underline"
            >
              Blackgrid
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
