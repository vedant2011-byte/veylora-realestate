"use client";

/**
 * CinematicHero — 809 frames, one continuous scroll story (v2).
 *
 * A 2300vh runway keeps roughly 40 frames per viewport of scroll — slow,
 * deliberate, cinematic. The sticky stage shows the native 9:16 column
 * (full-bleed on mobile, centered cinema on desktop). Six manifest-driven
 * chapters fade in/out at their segments; an end-card bridges into the
 * property discovery layer.
 */

import { useEffect, useRef } from "react";
import Link from "next/link";
import { CHAPTERS, FRAME_COUNT, chapterAt } from "@/lib/animation/frames";
import type { FrameSequence } from "@/lib/animation/FrameSequence";

export default function CinematicHero({
  seq,
  reducedMotion = false,
}: {
  seq: FrameSequence | null;
  reducedMotion?: boolean;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const railRef = useRef<HTMLSpanElement | null>(null);
  const endcardRef = useRef<HTMLDivElement | null>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeChapterRef = useRef(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section || !seq) return;

    seq.attachCanvas(canvas);
    void seq.loadCritical(8).then(() => {
      seq.setProgress(0);
      seq.render();
    });
    seq.start();
    (window as unknown as { __veydoraSeq?: FrameSequence }).__veydoraSeq = seq;

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? clamp01(-rect.top / total) : 0;
      seq.setProgress(p);

      /* Intro fades over the opening. */
      const introOpacity = clamp01(1 - p / 0.045);
      if (introRef.current) {
        introRef.current.style.opacity = String(introOpacity);
        introRef.current.style.transform = `translateY(${(1 - introOpacity) * -30}px)`;
        introRef.current.style.visibility = introOpacity <= 0.01 ? "hidden" : "visible";
      }
      if (cueRef.current) cueRef.current.style.opacity = String(clamp01(1 - p / 0.015));

      /* Frame counter + progress rail. */
      const frameNo = Math.round(p * (FRAME_COUNT - 1)) + 1;
      if (counterRef.current) {
        counterRef.current.textContent = `${String(frameNo).padStart(3, "0")} / ${FRAME_COUNT}`;
      }
      if (railRef.current) railRef.current.style.transform = `scaleY(${Math.max(0.004, p)})`;

      /* Chapter swap. */
      const chapter = chapterAt(p);
      if (chapter !== activeChapterRef.current) {
        CHAPTERS.forEach((_, i) => {
          chapterRefs.current[i]?.classList.toggle("chapter-active", i === chapter);
        });
        activeChapterRef.current = chapter;
      }

      /* End-card rises over the final 4% of the film. */
      if (endcardRef.current) {
        const show = p > 0.96;
        endcardRef.current.style.opacity = String(clamp01((p - 0.96) / 0.035));
        endcardRef.current.style.visibility = show ? "visible" : "hidden";
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("orientationchange", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("orientationchange", onScroll);
      delete (window as unknown as { __veydoraSeq?: FrameSequence }).__veydoraSeq;
      seq.stop();
    };
  }, [seq]);

  return (
    <section
      ref={sectionRef}
      id="film"
      aria-label="Veylora film — from land to a living home"
      className="relative bg-night"
      style={{ height: "2300vh" }}
      data-reduced={reducedMotion ? "true" : undefined}
    >
      <div className="sticky top-0 flex h-dvh w-full items-center justify-center overflow-hidden bg-night">
        {/* Native-aspect frame column */}
        <div
          className="relative h-full overflow-hidden bg-night"
          style={{ width: "min(100vw, calc(100dvh * 9 / 16))" }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="Scroll-driven film: land, structure, vision, craft, home"
          />

          {/* Cinematic vignette + scrims */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(10,9,7,0.5) 100%)" }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-night/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night/85 via-night/35 to-transparent" />

          {/* Intro copy — the only headline over the film's opening */}
          <div ref={introRef} className="absolute inset-x-0 bottom-14 z-10 px-6 will-change-transform sm:bottom-16 md:px-10">
            <h1 className="font-display text-[10.5vw] font-semibold leading-[0.98] tracking-tight text-paper sm:text-5xl lg:text-6xl">
              FIND A PLACE
              <br />
              THAT FEELS LIKE HOME.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/70 sm:text-[15px]">
              Explore thoughtfully selected properties designed around the way you live.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex h-12 min-w-44 items-center justify-center rounded-full bg-amber px-7 text-[13px] font-semibold uppercase tracking-[0.18em] text-night transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
              >
                Explore Properties
              </Link>
              <a
                href="#featured"
                className="inline-flex h-12 items-center justify-center rounded-full border border-paper/35 px-7 text-[13px] font-semibold uppercase tracking-[0.18em] text-paper transition-colors duration-300 hover:border-paper hover:bg-paper/10"
              >
                Discover More
              </a>
            </div>
          </div>

          {/* Scroll cue */}
          <div ref={cueRef} className="pointer-events-none absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.4em] text-paper/55">Scroll to explore</span>
            <span className="block h-9 w-px bg-gradient-to-b from-paper/60 to-transparent" />
          </div>

          {/* Chapter labels — one at a time, never over the story's focal point */}
          <div className="pointer-events-none absolute inset-0 z-[5]" aria-live="polite">
            {CHAPTERS.map((c, i) => (
              <div
                key={c.num}
                ref={(el) => {
                  chapterRefs.current[i] = el;
                }}
                className="chapter absolute left-6 top-[20%] max-w-[260px] transition-all duration-700 ease-out sm:left-10 md:left-14"
                style={{ opacity: 0, transform: "translateY(18px)" }}
                aria-hidden
              >
                <p className="font-display text-[11px] font-semibold tracking-[0.35em] text-amber">{c.num}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
                  {c.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-paper/65">{c.line}</p>
              </div>
            ))}
          </div>

          {/* Cinematic end-card — bridges film → discovery */}
          <div
            ref={endcardRef}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-night/72 px-6 text-center backdrop-blur-[2px]"
            style={{ opacity: 0, visibility: "hidden" }}
            aria-hidden
          >
            <p className="text-[11px] uppercase tracking-[0.4em] text-amber">The film ends</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-paper sm:text-5xl">
              NOW, FIND YOUR PLACE.
            </h2>
            <Link
              href="/explore"
              className="mt-8 inline-flex h-13 items-center rounded-full bg-amber px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform duration-300 hover:scale-[1.03]"
            >
              Explore Properties
            </Link>
          </div>
        </div>

        {/* Desktop-only rails */}
        <div className="pointer-events-none absolute left-8 top-1/2 hidden -translate-y-1/2 lg:block">
          <p className="text-[10px] uppercase tracking-[0.45em] text-paper/35" style={{ writingMode: "vertical-rl" }}>
            From land to keys — the Veylora film
          </p>
        </div>
        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex">
          <span ref={counterRef} className="text-[10px] uppercase tracking-[0.3em] text-paper/45 tabular-nums">
            001 / {FRAME_COUNT}
          </span>
          <span className="relative block h-44 w-px overflow-hidden bg-paper/15">
            <span
              ref={railRef}
              className="absolute inset-x-0 top-0 block h-full origin-top bg-amber"
              style={{ transform: "scaleY(0.004)" }}
            />
          </span>
          <span className="text-[9px] uppercase tracking-[0.35em] text-paper/30">Film</span>
        </div>
      </div>

      <style jsx>{`
        .chapter {
          transition-property: opacity, transform;
        }
        [data-reduced="true"] .chapter {
          transition: none;
        }
        .chapter-active {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </section>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}
