import { Suspense } from "react";
import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import ExploreClient from "@/components/ExploreClient";

export const metadata: Metadata = {
  title: "Explore Properties",
  description:
    "Search demo homes across Nashik and Pune — filter by location, type, price, bedrooms, possession and status.",
};

export default function ExplorePage() {
  return (
    <SiteShell>
      <section className="bg-paper-deep/70 pb-16 pt-28 md:pb-20 md:pt-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">Explore</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Find the one that fits.
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Every listing below is fictional demo content with realistic pricing —
            filter freely, save freely, compare freely.
          </p>
        </div>
      </section>

      <div className="bg-paper pt-10">
        <Suspense fallback={<div className="h-72" aria-hidden />}>
          <ExploreClient />
        </Suspense>
      </div>
    </SiteShell>
  );
}
