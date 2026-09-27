/** Master frame library helpers — 809 frames across 5 groups (see manifest). */
import manifest from "@/data/frame-manifest.json";

export const FRAME_MANIFEST = manifest as unknown as import("./FrameSequence").FrameManifest;
export const FRAME_COUNT = FRAME_MANIFEST.total;

export const frameSrc = (i: number): string =>
  FRAME_MANIFEST.frames[Math.min(FRAME_COUNT - 1, Math.max(0, i))].src;

export const allFrameSrcs = (): string[] => FRAME_MANIFEST.frames.map((f) => f.src);

export const CHAPTERS = FRAME_MANIFEST.chapters;

/** Chapter active at normalized progress p (−1 when between chapters). */
export const chapterAt = (p: number): number =>
  CHAPTERS.findIndex((c) => p >= c.from && p <= c.to);
