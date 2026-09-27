import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import CompareClient from "./CompareClient";

export const metadata: Metadata = {
  title: "Compare Properties",
  description: "Up to three demo homes side by side — price, area, configuration, possession — in the same order, every time.",
};

export default function ComparePage() {
  return (
    <SiteShell>
      <section className="bg-paper-deep/70 pb-12 pt-28 md:pb-14 md:pt-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">Compare</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Side by side, honestly.
          </h1>
          <p className="mt-3 max-w-md text-[15px] text-ink-soft">
            The same facts for every home, in the same order — because comparison should take minutes.
          </p>
        </div>
      </section>

      <section className="bg-paper pt-8">
        <CompareClient />
      </section>
    </SiteShell>
  );
}
