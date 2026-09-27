import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="flex min-h-[80vh] items-center justify-center bg-night px-5 text-center text-paper">
        <div>
          <p className="font-display text-[13px] font-semibold tracking-[0.4em] text-amber">404</p>
          <h1 className="mt-5 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            This address isn’t on the map.
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-[15px] text-paper/60">
            The page you’re after moved out — but plenty of good homes are still in the catalogue.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/explore"
              className="inline-flex h-13 items-center rounded-full bg-amber px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform hover:scale-[1.02]"
            >
              Explore properties
            </Link>
            <Link
              href="/"
              className="inline-flex h-13 items-center rounded-full border border-paper/40 px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-paper transition-colors hover:bg-paper hover:text-night"
            >
              Back home
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
