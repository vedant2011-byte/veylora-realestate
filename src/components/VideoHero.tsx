"use client";

/**
 * VideoHero — the cinematic opening, rebuilt around ONE native <video> (v4).
 *
 * The 809-frame scroll-driven canvas engine is gone. The film now ships as a
 * single optimized H.264 MP4 (desktop + mobile variants, see tools/make-video.mjs)
 * and plays with the browser's own decoder:
 *
 *   poster appears instantly → first touch/swipe/wheel/click anywhere on the
 *   hero calls video.play() → the film runs on native timing (27s) →
 *   on 'ended' the end-card rises and normal page scrolling takes over.
 *
 * No requestAnimationFrame playback loop, no scroll→frame mapping, no frame
 * decoding. Chapter copy is synced to video.currentTime via 'timeupdate'
 * (throttled to ~4Hz by the browser) instead of scroll progress.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

const CHAPTERS = [
  { num: "01", title: "THE LAND", line: "Every home begins with a place.", from: 0.02, to: 0.14 },
  { num: "02", title: "THE STRUCTURE", line: "Concrete waits for a story.", from: 0.18, to: 0.37 },
  { num: "03", title: "THE VISION", line: "Rooms appear before walls do.", from: 0.41, to: 0.58 },
  { num: "04", title: "THE CRAFT", line: "Every line, considered twice.", from: 0.62, to: 0.79 },
  { num: "05", title: "THE HOME", line: "Light learns where to live.", from: 0.83, to: 0.94 },
] as const;

type Phase = "poster" | "playing" | "done";

export default function VideoHero() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const chapterRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeChapterRef = useRef(-1);
  const [phase, setPhase] = useState<Phase>("poster");
  const [videoFailed, setVideoFailed] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  /* Reduced motion: never auto-play the film; offer a poster + explicit path in. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* Chapters + rail track the video's real clock, not scroll. 'timeupdate'
     fires at most ~4Hz, so this is negligible CPU. */
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    const p = video.currentTime / video.duration;

    const chapter = CHAPTERS.findIndex((c) => p >= c.from && p <= c.to);
    if (chapter !== activeChapterRef.current) {
      activeChapterRef.current = chapter;
      CHAPTERS.forEach((_, i) => {
        chapterRefs.current[i]?.classList.toggle("chapter-active", i === chapter);
      });
    }
    const rail = document.getElementById("film-rail");
    if (rail) rail.style.transform = `scaleY(${Math.max(0.004, p)})`;
  }, []);

  /* First meaningful interaction anywhere on the hero starts the film. */
  const startFilm = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.ended) return;
    setPhase((prev) => (prev === "poster" ? "playing" : prev));
    if (video.paused && !video.ended) {
      setBuffering(true);
      video
        .play()
        .catch(() => {
          /* Playback refused (transient decoder/permission hiccup): keep the
             poster and the continue affordance — never a stuck screen. */
          setPhase("poster");
          setBuffering(false);
        })
        .finally(() => setBuffering(false));
    }
  }, []);

  /* One-shot trigger set: touch, wheel, click, keys. pointermove alone is NOT
     a trigger (hover shouldn't play); touchmove IS (a swipe should). */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || phase !== "poster" || videoFailed) return;
    if (reducedMotion) return;

    const opts: AddEventListenerOptions = { passive: true, once: true };
    const onKey = (ev: Event) => {
      if (["Enter", " ", "ArrowDown", "PageDown"].includes((ev as KeyboardEvent).key)) startFilm();
    };
    const targets: Array<[EventTarget, string, EventListener]> = [
      [section, "touchstart", startFilm],
      [section, "touchmove", startFilm],
      [section, "wheel", startFilm],
      [section, "click", startFilm],
      [window, "keydown", onKey],
    ];
    for (const [t, name, fn] of targets) t.addEventListener(name, fn, opts);
    return () => {
      for (const [t, name, fn] of targets) t.removeEventListener(name, fn);
    };
  }, [phase, startFilm, reducedMotion, videoFailed]);

  /* Pause when scrolled out of view; release nothing while paused mid-film so
     seeking stays instant. */
  useEffect(() => {
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && !video.paused && !video.ended) video.pause();
      },
      { threshold: 0.15 },
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  const onEnded = useCallback(() => {
    setPhase("done");
    const video = videoRef.current;
    /* Film complete: stop decoding and drop the buffered data. The <source>
       children must go too — load() would otherwise re-select them and
       silently re-fetch the MP4. */
    video?.pause();
    try {
      video?.querySelectorAll("source").forEach((s) => s.remove());
      video?.removeAttribute("src");
      video?.load();
    } catch {
      /* some engines throw on reset after ended — the film is done either way */
    }
    setBuffering(false);
  }, []);

  const onSkip = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.ended) {
      /* Jump to the end: fires 'ended' naturally, which runs the same
         transition path as a watched-through film. */
      if (video.duration) video.currentTime = video.duration - 0.05;
      video.play().catch(() => {
        setPhase("done");
      });
    } else {
      setPhase("done");
    }
  }, []);

  const filmDone = phase === "done";

  return (
    <section
      ref={sectionRef}
      id="film"
      aria-label="Veylora film — from land to a living home"
      className="relative bg-night"
      data-reduced={reducedMotion ? "true" : undefined}
    >
      <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-night">
        {/* Native-aspect video column — identical geometry to the old film stage */}
        <div
          className="relative h-full overflow-hidden bg-night"
          style={{ width: "min(100vw, calc(100dvh * 9 / 16))" }}
        >
          {/* Hard fallback: if the video element can't load its source, keep the
              exact first frame painted as an <img> — never a blank screen. */}
          {videoFailed && (
            <img
              src="/video/hero-cinematic-poster.jpg"
              alt="Veylora — the first frame of the film"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${filmDone ? "opacity-0" : "opacity-100"}`}
            poster="/video/hero-cinematic-poster.jpg"
            preload="metadata"
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            aria-label="Veylora film: land, structure, vision, craft, home"
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onWaiting={() => setBuffering(true)}
            onPlaying={() => setBuffering(false)}
            onError={() => setVideoFailed(true)}
          >
            {/* The browser picks exactly ONE of these — never both. */}
            <source src="/video/hero-cinematic-mobile.mp4" media="(max-width: 768px)" type="video/mp4" />
            <source src="/video/hero-cinematic-desktop.mp4" type="video/mp4" />
            {/* No supported source: the poster attribute stays painted. */}
          </video>

          {/* Cinematic vignette + scrims (unchanged from the frame film) */}
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${filmDone ? "opacity-0" : "opacity-100"}`}
            style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(10,9,7,0.5) 100%)" }}
          />
          <div aria-hidden className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-night/80 to-transparent ${filmDone ? "opacity-0" : ""}`} />
          <div aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-night/85 via-night/35 to-transparent ${filmDone ? "opacity-0" : ""}`} />

          {/* Intro copy — visible over the poster, fades once the film starts */}
          <div
            className={`absolute inset-x-0 bottom-14 z-10 px-6 transition-all duration-700 ease-out will-change-transform sm:bottom-16 md:px-10 ${phase === "poster" ? "opacity-100 translate-y-0" : "pointer-events-none -translate-y-8 opacity-0"}`}
            aria-hidden={phase !== "poster"}
          >
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

            {/* First-touch cue / reduced-motion play button — part of the copy
                flow so it can never collide with the buttons on short screens. */}
            {reducedMotion ? (
              <button
                type="button"
                onClick={startFilm}
                className="mt-7 inline-flex h-11 items-center justify-center rounded-full border border-paper/35 bg-night/40 px-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-paper/10"
              >
                Play the film
              </button>
            ) : (
              <div className="pointer-events-none mt-7 flex items-center gap-3">
                <span className="animate-pulse text-[9px] uppercase tracking-[0.4em] text-paper/70">
                  Touch to begin
                </span>
                <span className="block h-px w-12 bg-gradient-to-r from-paper/60 to-transparent" />
              </div>
            )}
          </div>

          {/* Buffering shimmer — only if playback isn't ready after interaction */}
          {buffering && phase === "playing" && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-5" role="status" aria-label="Loading the film">
              <span className="h-0.5 w-16 overflow-hidden rounded-full bg-paper/20">
                <span className="block h-full w-1/2 animate-[loadslide_1.1s_ease-in-out_infinite] rounded-full bg-amber" />
              </span>
            </div>
          )}

          {/* Skip affordance — the film runs 27s; nobody is forced to wait. */}
          {phase === "playing" && (
            <button
              type="button"
              onClick={onSkip}
              className="absolute bottom-5 right-4 z-20 inline-flex h-9 items-center rounded-full border border-paper/25 bg-night/50 px-4 text-[10px] font-semibold uppercase tracking-[0.28em] text-paper/70 transition-colors hover:border-paper/60 hover:text-paper"
            >
              Skip
            </button>
          )}

          {/* Chapter labels — driven by video.currentTime */}
          <div aria-live="polite" className="pointer-events-none absolute inset-0 z-[5]">
            {CHAPTERS.map((c, i) => (
              <div
                key={c.num}
                ref={(el) => {
                  chapterRefs.current[i] = el;
                }}
                aria-hidden
                className="chapter absolute left-6 top-[20%] max-w-[260px] transition-all duration-700 ease-out sm:left-10 md:left-14"
                style={{ opacity: 0, transform: "translateY(18px)" }}
              >
                <p className="font-display text-[11px] font-semibold tracking-[0.35em] text-amber">{c.num}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
                  {c.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-paper/65">{c.line}</p>
              </div>
            ))}
          </div>

          {/* End-card — bridges film → discovery (same bridge as before) */}
          <div
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-night/72 px-6 text-center backdrop-blur-[2px] transition-opacity duration-700 ${filmDone ? "opacity-100" : "pointer-events-none opacity-0"}`}
            aria-hidden={!filmDone}
          >
            <p className="text-[11px] uppercase tracking-[0.4em] text-amber">The film ends</p>
            <h2 className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight text-paper sm:text-5xl">
              NOW, FIND YOUR PLACE.
            </h2>
            <p className="mt-5 text-sm uppercase tracking-[0.3em] text-paper/50">Scroll to explore</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/explore"
                className="inline-flex h-13 items-center rounded-full bg-amber px-9 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-night transition-transform duration-300 hover:scale-[1.03]"
              >
                Explore Properties
              </Link>
              <a
                href="#featured"
                className="inline-flex h-13 items-center justify-center rounded-full border border-paper/35 px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.2em] text-paper transition-colors duration-300 hover:bg-paper/10"
              >
                Discover More
              </a>
            </div>
          </div>
        </div>

        {/* Desktop-only rails */}
        <div className="pointer-events-none absolute left-8 top-1/2 hidden -translate-y-1/2 lg:block">
          <p className="text-[10px] uppercase tracking-[0.45em] text-paper/35" style={{ writingMode: "vertical-rl" }}>
            From land to keys — the Veylora film
          </p>
        </div>
        <div className={`pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-4 lg:flex ${filmDone ? "opacity-0" : ""}`}>
          <span className="text-[10px] uppercase tracking-[0.3em] text-paper/45 tabular-nums">The film</span>
          <span className="relative block h-44 w-px overflow-hidden bg-paper/15">
            <span
              id="film-rail"
              className="absolute inset-x-0 top-0 block h-full origin-top bg-amber"
              style={{ transform: "scaleY(0.004)" }}
            />
          </span>
          <span className="text-[9px] uppercase tracking-[0.35em] text-paper/30">Veylora</span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes loadslide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        .chapter {
          transition-property: opacity, transform;
        }
        [data-reduced="true"] .chapter,
        [data-reduced="true"] .animate-pulse {
          transition: none;
          animation: none;
        }
        .chapter-active {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
      `}</style>
    </section>
  );
}
