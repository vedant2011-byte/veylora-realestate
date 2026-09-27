"use client";

/**
 * HeroProvider — orchestrates the two-stage cinematic entry (v2).
 *
 *   loader (real, gated on critical frames) → fade → hero live →
 *   background decode of the remaining library (never blocks the user).
 *
 * One FrameSequence engine for the whole session. Returning visitors skip
 * the loader but still get the full library progressively.
 */

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FRAME_MANIFEST } from "@/lib/animation/frames";
import { FrameSequence } from "@/lib/animation/FrameSequence";
import { useMounted, usePrefersReducedMotion } from "@/lib/hooks";

const LoadingScreen = dynamic(() => import("./LoadingScreen"), { ssr: false });
const CinematicHero = dynamic(() => import("./CinematicHero"), { ssr: false });

const SESSION_KEY = "veylora:seenIntro";
/** Critical pre-roll: enough 9:16 frames for the opening chapter + buffer. */
const CRITICAL_FRAMES = 56;

export default function HeroProvider() {
  const mounted = useMounted();
  const reducedMotion = usePrefersReducedMotion();
  const [loaderDone, setLoaderDone] = useState(false);
  const [ready, setReady] = useState(false);
  const seqRef = useRef<FrameSequence | null>(null);
  const [skip, setSkip] = useState<boolean | null>(null);

  useEffect(() => {
    let s = false;
    try {
      /* ?intro=1 forces the loading experience (demo/testing); otherwise the
         session flag skips the loader for returning visitors. */
      const force = new URLSearchParams(window.location.search).get("intro") === "1";
      s = !force && window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      s = false;
    }
    setSkip(s);
    const seq = new FrameSequence({ manifest: FRAME_MANIFEST });
    seqRef.current = seq;
    setReady(true);
    if (s) {
      /* Returning visitor: still decode the critical head before painting,
         then queue the rest — but never gate on a loader. */
      void seq.loadCritical(CRITICAL_FRAMES).then(() => seq.queueBackground());
    }
    return () => seq.dispose();
  }, []);

  /* Stage 2: after entry, decode the remaining film frames in idle time.
     Property photos are NOT prefetched: they lazy-load on demand, and a
     speculative prefetch list can't match the responsive srcSet URLs the
     browser actually needs (wasted downloads + preload warnings). */
  useEffect(() => {
    if (!loaderDone && skip !== true) return;
    const seq = seqRef.current;
    if (seq && !seq.backgroundDone) seq.queueBackground();
  }, [loaderDone, skip]);

  useEffect(() => {
    if (!mounted || skip) return;
    if (!loaderDone) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mounted, skip, loaderDone]);

  const showLoader = mounted && ready && skip === false;

  return (
    <>
      {showLoader && !loaderDone && (
        <LoadingScreen
          reducedMotion={reducedMotion}
          engine={seqRef.current!}
          criticalFrames={CRITICAL_FRAMES}
          onComplete={() => {
            try {
              window.sessionStorage.setItem(SESSION_KEY, "1");
            } catch {
              /* private mode */
            }
            setLoaderDone(true);
          }}
        />
      )}

      {ready && (
        <CinematicHero reducedMotion={reducedMotion || skip === true} seq={seqRef.current} />
      )}

      {/* Reserve the runway height during load so the page never shifts. */}
      {showLoader && !loaderDone && <div aria-hidden style={{ height: "2300vh" }} />}
    </>
  );
}
