import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import { Reveal } from "@/lib/Reveal";

export const metadata: Metadata = {
  title: "About",
  description:
    "Veylora is a property discovery prototype built around a simple belief: finding a home should feel like the film — patient, clear, and ending with keys.",
};

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="bg-paper-deep/70 pb-16 pt-28 md:pb-24 md:pt-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">About</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            A calmer way to search for a home.
          </h1>
        </div>
      </section>

      <section className="bg-paper py-16 md:py-24">
        <div className="mx-auto max-w-3xl space-y-14 px-5 md:px-8">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">The philosophy</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">
              Property portals optimize for infinite scroll. Veylora optimizes for
              <em> stopping</em>. The opening film — an empty plot slowly becoming
              keys in a hand — is the whole pitch: homes are not inventory, they are
              time. A short, curated catalogue with honest numbers beats a
              thousand-row database nobody trusts.
            </p>
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">How this platform works</h2>
            <ol className="mt-6 space-y-6 border-l-2 border-ink/10 pl-6">
              {[
                ["The film carries the story", "Scroll maps to a 150-frame sequence from land to floor plan. Nothing on this site needs to explain what the animation can show."],
                ["The catalogue stays small", "Sixteen fictional homes across apartments, villas, row houses, plots and penthouses — each with complete, comparable facts."],
                ["Your shelf, your device", "Save and compare live in your browser. No sign-up, no tracking pixels, nothing leaves your device."],
                ["Swap the data, keep the experience", "The demo dataset is deliberately isolated behind one data layer, ready to be replaced by a real backend without touching the interface."],
              ].map(([t, d], i) => (
                <li key={t} className="relative">
                  <span aria-hidden className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-amber bg-paper" />
                  <h3 className="font-display text-lg font-semibold tracking-tight">
                    <span className="mr-2 text-amber-deep">0{i + 1}</span>
                    {t}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-mute">{d}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">What makes it different</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                ["Numbers before dazzle", "Price, area, possession — on every card, before any enquiry button."],
                ["One accent, no noise", "The amber from the film's survey glow is the only colour allowed to shout."],
                ["Mobile as first-class", "The film is full-bleed on phones; filters are thumb rails; targets are 44px+"],
                ["Honesty as a feature", "Fictional listings are labelled as fictional. Demo notes are labelled as demo notes."],
              ].map(([t, d]) => (
                <div key={t} className="rounded-2xl border border-ink/10 bg-white/50 p-5">
                  <h3 className="font-display text-[15px] font-semibold tracking-tight">{t}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-mute">{d}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="rounded-3xl bg-ink p-8 text-paper md:p-10">
            <h2 className="font-display text-xl font-semibold tracking-tight text-amber">The commitment</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-paper/75">
              Transparent property discovery: no unverifiable claims, no countdown
              timers, no dark patterns. What the label says is what the home is —
              and when something is a prototype, it says so.
            </p>
            <Link
              href="/explore"
              className="mt-7 inline-flex h-12 items-center rounded-full bg-amber px-7 text-[12px] font-semibold uppercase tracking-[0.18em] text-night transition-transform hover:scale-[1.02]"
            >
              See the catalogue
            </Link>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
