"use client";

import { useState } from "react";
import Link from "next/link";
import { CITY_OPTIONS, PROPERTIES } from "@/data/properties";
import { cn } from "@/lib/utils";

const LOCATION_INFO: Record<
  string,
  { line: string; lifestyle: string[]; connectivity: string[]; everyday: string[]; future: string }
> = {
  Nashik: {
    line: "Wine country mornings, temple-town evenings, and a commute measured in minutes.",
    lifestyle: ["Godavari riverside walks", "Vineyard weekend drives", "Gangapur backwater sunsets"],
    connectivity: ["Mumbai–Agra highway", "Nashik Road railway station", "Ozar & Sinnar MIDC belts"],
    everyday: ["College Road cafés and markets", "Established schools and clinics", "Compact old-city bazaars"],
    future:
      "Growth corridors along Trimbak and Dindori roads are where most new plotted supply is opening up (illustrative demo note).",
  },
  Pune: {
    line: "The IT heartbeat of Maharashtra with leafy heritage lanes at its centre.",
    lifestyle: ["Koregaon Park café strips", "Mulshi dam day trips", "Osho Garden evenings"],
    connectivity: ["Hinjawadi IT park", "Pune railway station", "Pune International Airport"],
    everyday: ["Phoenix Marketcity retail", "University campuses", "Multi-speciality hospitals"],
    future:
      "Metro and ring-road works keep extending the practical western corridor (illustrative demo note).",
  },
};

export default function LocationsClient() {
  const [active, setActive] = useState<string>(CITY_OPTIONS[0]);
  const info = LOCATION_INFO[active];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 md:px-8">
      <div className="flex gap-3" role="tablist" aria-label="Choose a city">
        {CITY_OPTIONS.map((city) => {
          const count = PROPERTIES.filter((p) => p.city === city).length;
          return (
            <button
              key={city}
              type="button"
              role="tab"
              aria-selected={active === city}
              onClick={() => setActive(city)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-6 py-4 transition-colors",
                active === city ? "border-ink bg-ink text-paper" : "border-ink/20 bg-white/60 hover:border-ink/45",
              )}
            >
              <span className="font-display text-lg font-semibold tracking-tight">{city}</span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px]",
                  active === city ? "bg-paper/20" : "bg-ink/10 text-ink-mute",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div key={active} className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grain relative overflow-hidden rounded-3xl bg-ink p-8 text-paper md:p-10">
          <p className="text-[11px] uppercase tracking-[0.35em] text-amber">{active}, Maharashtra</p>
          <p className="mt-4 font-display text-2xl font-light leading-snug md:text-[28px]">{info.line}</p>
          <p className="mt-6 max-w-md text-[13px] leading-relaxed text-paper/55">{info.future}</p>
          <Link
            href={`/explore?q=${encodeURIComponent(active)}`}
            className="mt-8 inline-flex h-12 items-center rounded-full bg-amber px-6 text-[12px] font-semibold uppercase tracking-[0.18em] text-night transition-transform hover:scale-[1.02]"
          >
            See {active} homes
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          <InfoCard title="Lifestyle" items={info.lifestyle} />
          <InfoCard title="Connectivity" items={info.connectivity} />
          <InfoCard title="Everyday" items={info.everyday} />
          <InfoCard title="What's coming" items={[info.future]} dim />
        </div>
      </div>

      <p className="mt-6 rounded-xl bg-amber/10 px-4 py-3 text-[12px] leading-relaxed text-amber-deep">
        Demo content: neighbourhood notes are illustrative examples for this prototype, not claims about current infrastructure.
      </p>
    </div>
  );
}

function InfoCard({ title, items, dim = false }: { title: string; items: string[]; dim?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-5", dim ? "border-dashed border-ink/20 bg-transparent" : "border-ink/10 bg-white/60")}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-mute">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-ink-soft">
            <span className={cn("mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full", dim ? "bg-amber" : "bg-sage")} aria-hidden />
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}
