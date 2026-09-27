"use client";

import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export default function FavoriteButton({
  slug,
  variant = "chip",
}: {
  slug: string;
  variant?: "chip" | "icon";
}) {
  const favorites = useFavorites();
  const active = favorites.includes(slug);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        import("@/lib/favorites").then((m) => m.toggleFavorite(slug));
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${slug} from saved` : `Save ${slug}`}
      className={cn(
        "group/fav inline-flex items-center justify-center transition-colors duration-300",
        variant === "chip"
          ? "h-11 gap-2 rounded-full border px-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
          : "h-11 w-11 rounded-full border",
        active
          ? "border-amber/70 bg-amber/15 text-amber-deep"
          : "border-ink/20 bg-paper/85 text-ink-mute backdrop-blur-sm hover:border-ink/40 hover:text-ink",
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
        className={cn("transition-transform duration-300", active && "scale-110")}
      >
        <path d="M12 21s-7.5-4.9-9.6-9.2C.8 8.4 2.7 4.9 6.2 4.9c2.2 0 3.9 1.2 4.8 3 0.9-1.8 2.6-3 4.8-3 3.5 0 5.4 3.5 3.8 6.9C17.5 16.1 12 21 12 21z" />
      </svg>
      {variant === "chip" && <span>{active ? "Saved" : "Save"}</span>}
    </button>
  );
}
