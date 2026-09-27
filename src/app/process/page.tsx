import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import { Reveal } from "@/lib/Reveal";

export const metadata: Metadata = {
  title: "Our Process",
  description:
    "Discover, shortlist, visit, evaluate, move in — the five-step Veylora way of finding a home, explained without jargon.",
};

const STEPS = [
  {
    num: "01",
    title: "Discover",
    body: "Begin with the film, then the catalogue. Filter by the things that actually narrow life down: city, budget, possession. No 900-row result lists — a short shelf of homes that pass the test.",
    side: "left" as const,
    tint: "bg-paper",
  },
  {
    num: "02",
    title: "Shortlist",
    body: "Save the ones that make you pause. Three homes maximum in compare — enough to see trade-offs clearly, too few to drown in spreadsheets. Everything stays on your device.",
    side: "right" as const,
    tint: "bg-paper-deep",
  },
  {
    num: "03",
    title: "Visit",
    body: "This prototype stops at the door — but the enquiry desk is one tap away on every listing. In production, this is where scheduled walks-throughs and video tours begin.",
    side: "left" as const,
    tint: "bg-paper",
  },
  {
    num: "04",
    title: "Evaluate",
    body: "Specifications, possession timelines and what's around — the same facts for every home, in the same order, so comparing two options takes minutes, not memos.",
    side: "right" as const,
    tint: "bg-paper-deep",
  },
  {
    num: "05",
    title: "Move In",
    body: "The film ends with keys because that's the only ending that matters. Everything before it — the filters, the saved hearts, the compare table — exists to make this step boring in the best way.",
    side: "left" as const,
    tint: "bg-paper",
  },
];

export default function ProcessPage() {
  return (
    <SiteShell>
      <section className="bg-night pb-16 pt-32 text-paper md:pb-24 md:pt-40">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber">Our process</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Five steps between
            <br />
            searching and staying.
          </h1>
        </div>
      </section>

      <section className="relative bg-paper py-20 md:py-28">
        {/* Vertical spine */}
        <span aria-hidden className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-ink/20 to-transparent md:block" />

        <div className="mx-auto max-w-6xl space-y-10 px-5 md:space-y-16 md:px-8">
          {STEPS.map((s, i) => (
            <Reveal
              key={s.num}
              delay={60}
              className={`relative md:w-[calc(50%-40px)] ${s.side === "right" ? "md:ml-auto" : ""}`}
            >
              {/* Node on the spine */}
              <span
                aria-hidden
                className={`absolute top-8 hidden h-3 w-3 rounded-full border-2 border-amber bg-paper md:block ${
                  s.side === "left" ? "-right-[46px]" : "-left-[46px]"
                }`}
              />
              <article className={`rounded-3xl border border-ink/10 p-7 md:p-9 ${s.tint}`}>
                <p className="font-display text-[13px] font-semibold tracking-[0.3em] text-amber-deep">{s.num}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">{s.title}</h2>
                <p className="mt-3.5 max-w-md text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                {i === 1 && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href="/saved"
                      className="inline-flex h-11 items-center rounded-full border border-ink/25 px-5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-ink hover:text-paper"
                    >
                      Your saved shelf
                    </Link>
                    <Link
                      href="/compare"
                      className="inline-flex h-11 items-center rounded-full border border-ink/25 px-5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-ink hover:text-paper"
                    >
                      Open compare
                    </Link>
                  </div>
                )}
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-20 max-w-2xl px-5 text-center md:px-8">
          <p className="font-display text-2xl font-light leading-snug text-ink-soft md:text-3xl">
            “Boring paperwork, unforgettable keys.”
          </p>
          <Link
            href="/explore"
            className="mt-8 inline-flex h-13 items-center rounded-full bg-amber px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform hover:scale-[1.02]"
          >
            Start at step one
          </Link>
        </Reveal>
      </section>
    </SiteShell>
  );
}
