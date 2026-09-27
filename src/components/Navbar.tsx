"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/properties", label: "Properties" },
  { href: "/locations", label: "Experience" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onDark = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Lock body scroll while the mobile menu is open; close on route change. */
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const solid = scrolled || !onDark;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
          solid ? "bg-paper/90 shadow-[0_1px_0_rgba(23,20,16,0.08)] backdrop-blur-md" : "bg-transparent",
        )}
      >
        <nav aria-label="Primary" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:h-[72px] md:px-8">
          <Link
            href="/"
            aria-label="Veylora home"
            className="-ml-2 flex min-h-11 items-center gap-2.5 rounded-full px-2"
          >
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border font-display text-sm font-semibold",
                solid ? "border-ink/30 text-ink" : "border-paper/40 text-paper",
              )}
            >
              V
            </span>
            <span
              className={cn(
                "font-display text-[15px] font-semibold tracking-[0.22em]",
                solid ? "text-ink" : "text-paper",
              )}
            >
              VEYLORA
            </span>
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(
                    "link-sweep text-[12px] font-medium uppercase tracking-[0.2em]",
                    solid ? "text-ink-soft hover:text-ink" : "text-paper/80 hover:text-paper",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              href="/saved"
              aria-label="Saved properties"
              className={cn(
                "hidden h-11 items-center rounded-full border px-5 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors md:inline-flex",
                solid ? "border-ink/25 text-ink hover:bg-ink hover:text-paper" : "border-paper/35 text-paper hover:bg-paper hover:text-night",
              )}
            >
              Saved
            </Link>

            {/* Mobile menu button — 44px+ touch target */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border lg:hidden",
                solid ? "border-ink/25 text-ink" : "border-paper/35 text-paper",
              )}
            >
              <span className="relative block h-[10px] w-[18px]">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300",
                    open && "top-1/2 -translate-y-1/2 rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-300",
                    open && "bottom-1/2 translate-y-1/2 -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </nav>
      </header>

      {/* Full-screen mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-40 bg-night transition-[opacity,visibility] duration-500 lg:hidden",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex h-full flex-col justify-between px-7 pb-10 pt-28">
          <ul className="space-y-2">
            {NAV.map((item, i) => (
              <li
                key={item.href}
                className={cn(
                  "transition-all duration-500",
                  open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                )}
                style={{ transitionDelay: open ? `${80 + i * 45}ms` : "0ms" }}
              >
                <Link
                  href={item.href}
                  className="flex min-h-14 items-center justify-between border-b border-white/10 py-3 font-display text-[26px] font-medium tracking-tight text-paper"
                >
                  {item.label}
                  <span aria-hidden className="text-[11px] tracking-[0.3em] text-paper/30">
                    0{i + 1}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div
            className={cn(
              "flex items-center justify-between transition-all duration-500",
              open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
            style={{ transitionDelay: open ? "360ms" : "0ms" }}
          >
            <Link
              href="/saved"
              className="inline-flex h-12 items-center rounded-full border border-paper/30 px-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-paper"
            >
              Saved ♡
            </Link>
            <Link
              href="/compare"
              className="inline-flex h-12 items-center rounded-full bg-amber px-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-night"
            >
              Compare
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
