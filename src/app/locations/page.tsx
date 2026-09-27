import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import LocationsClient from "./LocationsClient";

export const metadata: Metadata = {
  title: "Locations & Lifestyle",
  description:
    "Nashik and Pune neighbourhoods through the Veylora lens — lifestyle, connectivity, everyday convenience and honest demo-notes about the future.",
};

export default function LocationsPage() {
  return (
    <SiteShell>
      <section className="bg-paper-deep/70 pb-12 pt-28 md:pb-16 md:pt-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">Experience</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            A city is the first room of every home.
          </h1>
        </div>
      </section>

      <section className="bg-paper py-10 md:py-14">
        <LocationsClient />
      </section>
    </SiteShell>
  );
}
