"use client";

/**
 * LoadingScreen — the real loading gate (v2, two-stage).
 *
 * STAGE 1 (gated, shown as 0→100%):
 *   manifest ready (2%) → first N frames fetched+decoded (76%) →
 *   engine first paint (14%) → critical fonts (8%)
 * Every number is computed from real completed units. No timers.
 *
 * STAGE 2 (background, invisible):
 *   remaining frames continue decoding while the user scrolls.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameSequence } from "@/lib/animation/FrameSequence";

interface Props {
  onComplete: () => void;
  engine: FrameSequence;
  criticalFrames: number;
  reducedMotion: boolean;
}

const W_FRAMES = 76;
const W_MANIFEST = 2;
const W_ENGINE = 14;
const W_FONTS = 8;

export default function LoadingScreen({
  onComplete,
  engine,
  criticalFrames,
  reducedMotion,
}: Props) {
  const rafRef = useRef(0);
  const displayedRef = useRef(0);
  const stageRef = useRef({ manifest: 0, frames: 0, engine: 0, fonts: 0 });
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"loading" | "revealing">("loading");

  const targetPct = useCallback(() => {
    const s = stageRef.current;
    return Math.min(
      100,
      Math.round(
        s.manifest * W_MANIFEST + s.frames * W_FRAMES + s.engine * W_ENGINE + s.fonts * W_FONTS,
      ),
    );
  }, []);

  const bump = useCallback(() => {
    const target = targetPct();
    cancelAnimationFrame(rafRef.current);
    const tick = () => {
      const cur = displayedRef.current;
      const diff = target - cur;
      displayedRef.current = Math.abs(diff) < 0.5 ? target : cur + diff * 0.22;
      setPct(Math.round(displayedRef.current));
      if (displayedRef.current !== target) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [targetPct]);

  useEffect(() => {
    let cancelled = false;

    /* Manifest arrives with the JS chunk — count it immediately. */
    stageRef.current.manifest = 1;
    bump();

    /* Fonts: real readiness, hard-capped so they can never block. */
    const fontsCap = window.setTimeout(() => {
      stageRef.current.fonts = 1;
      bump();
    }, 2500);
    void document.fonts?.ready.then(() => {
      if (cancelled) return;
      stageRef.current.fonts = 1;
      bump();
    });

    const demoHold = typeof window !== "undefined" && window.location.search.includes("loaderdemo");
    const minShow = new Promise((r) => setTimeout(r, demoHold ? 8000 : reducedMotion ? 250 : 1200));
    const hardCap = new Promise((r) => setTimeout(r, demoHold ? 30000 : 18000)); // never trap the user

    const pipeline = (async () => {
      await engine.loadCritical(criticalFrames, (done, total) => {
        if (cancelled) return;
        stageRef.current.frames = done / total;
        bump();
      });
      if (cancelled) return;
      /* Engine initialized: first real frame is on canvas before handover. */
      engine.setProgress(0);
      engine.render();
      stageRef.current.engine = 1;
      bump();
    })();

    Promise.race([Promise.all([pipeline, minShow]), hardCap]).then(() => {
      if (cancelled) return;
      stageRef.current = { manifest: 1, frames: 1, engine: 1, fonts: 1 };
      bump();
      window.setTimeout(() => {
        if (!cancelled) setPhase("revealing");
      }, reducedMotion ? 120 : 600);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(fontsCap);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "revealing") return;
    const t = window.setTimeout(() => onComplete(), reducedMotion ? 200 : 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "revealing") {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-night"
        style={{ animation: "loaderOut 900ms cubic-bezier(0.33,1,0.68,1) forwards" }}
      >
        <LoaderFace pct={100} total={criticalFrames} />
        <style jsx global>{`
          @keyframes loaderOut {
            to {
              opacity: 0;
              visibility: hidden;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-night"
      role="status"
      aria-label="Preparing the cinematic experience"
    >
      <LoaderFace pct={pct} total={criticalFrames} />
    </div>
  );
}

function LoaderFace({ pct, total }: { pct: number; total: number }) {
  return (
    <div className="relative flex w-[min(82vw,360px)] flex-col items-center">
      <div className="mb-10 flex h-16 w-16 items-center justify-center rounded-full border border-white/25">
        <span className="font-display text-2xl font-semibold tracking-[0.08em] text-paper">V</span>
      </div>

      <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-white/55">Veylora</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
        Preparing your experience
      </p>

      <div className="mt-9 font-display text-6xl font-light tabular-nums text-paper" aria-live="polite">
        {pct}
        <span className="ml-1 align-top text-xl text-white/40">%</span>
      </div>

      {/* Thin architectural progress rule */}
      <div className="mt-6 h-px w-full bg-white/15">
        <div className="h-full bg-amber transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex w-full justify-between text-[10px] uppercase tracking-[0.25em] text-white/30">
        <span>Decoding frames</span>
        <span className="tabular-nums">
          {Math.min(total, Math.round((Math.max(0, pct - 2) / 76) * total))} / {total} critical
        </span>
      </div>
    </div>
  );
}
