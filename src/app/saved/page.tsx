import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import SavedClient from "./SavedClient";

export const metadata: Metadata = {
  title: "Saved Properties",
  description: "Your shortlist, stored privately on this device — no account needed.",
};

export default function SavedPage() {
  return (
    <SiteShell>
      <section className="bg-paper-deep/70 pb-12 pt-28 md:pb-14 md:pt-36">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-deep">Saved</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
            Your shelf.
          </h1>
        </div>
      </section>

      <section className="bg-paper pt-10">
        <SavedClient />
      </section>
    </SiteShell>
  );
}
