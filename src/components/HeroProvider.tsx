"use client";

/**
 * HeroProvider — entry orchestrator (v4, video era).
 *
 * The two-stage loader + 809-frame decode pipeline is gone. The opening
 * experience is now a single native <video> (VideoHero): the poster paints
 * immediately, the first touch starts playback, and the browser's own
 * decoder does the work. No frame library, no rAF engine, no loader gate —
 * so there is nothing to orchestrate beyond mounting the hero.
 */

import dynamic from "next/dynamic";

const VideoHero = dynamic(() => import("./VideoHero"), { ssr: false });

export default function HeroProvider() {
  return <VideoHero />;
}
