import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { Reveal } from "@/lib/Reveal";
import { INSTAGRAM_URL } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: "Interested in a property? Let’s find a place that fits your life — reach Veylora on Instagram.",
};

export default function ContactPage() {
  return (
    <SiteShell>
      <section className="grain relative overflow-hidden bg-night pb-24 pt-32 text-paper md:pb-32 md:pt-40">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(55% 70% at 75% 15%, rgba(217,142,50,0.18), transparent 60%)" }}
        />
        <div className="relative mx-auto max-w-3xl px-5 text-center md:px-8">
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber">Contact</p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
              Interested in a property?
            </h1>
            <p className="mx-auto mt-5 max-w-md text-[15.5px] leading-relaxed text-paper/65">
              Let’s find a place that fits your life.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 min-w-52 items-center justify-center rounded-full bg-amber px-9 text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform duration-300 hover:scale-[1.03]"
              >
                Contact Us
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-14 min-w-52 items-center justify-center gap-3 rounded-full border border-paper/40 px-9 text-[13px] font-semibold uppercase tracking-[0.2em] text-paper transition-colors hover:bg-paper hover:text-night"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                </svg>
                Instagram
              </a>
            </div>

            <p className="mt-8 text-[12px] text-paper/40">
              Both buttons open the same Veylora Instagram profile in a new tab.
            </p>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
