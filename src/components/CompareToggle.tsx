"use client";

import { useState } from "react";
import { MAX_COMPARE_SLOTS, toggleCompare, useCompare } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export default function CompareToggle({ slug }: { slug: string }) {
  const compare = useCompare();
  const active = compare.includes(slug);
  const [hint, setHint] = useState<"added" | "removed" | "full" | null>(null);

  const onClick = () => {
    const result = toggleCompare(slug);
    setHint(result);
    window.setTimeout(() => setHint(null), 1600);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${slug} from comparison` : `Add ${slug} to comparison`}
      title={hint === "full" ? `Compare holds ${MAX_COMPARE_SLOTS} homes` : undefined}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300",
        active
          ? "border-ink bg-ink text-paper"
          : "border-ink/20 text-ink-mute hover:border-ink/45 hover:text-ink",
      )}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M7 4v16M17 4v16M3 8l4-4 4 4M21 16l-4 4-4-4" />
      </svg>
      {hint === "full" ? `Max ${MAX_COMPARE_SLOTS}` : active ? "Comparing" : "Compare"}
    </button>
  );
}
