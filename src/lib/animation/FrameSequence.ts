/**
 * FrameSequence — the cinematic scroll-driven frame player (v3.1, mobile-safe).
 *
 * One engine, one film, one rAF loop. The 809-frame library (5 groups) is
 * treated as a single global timeline: the renderer thinks in globalFrame
 * and never "switches scenes".
 *
 * Playback model:
 *   scroll → targetFrame (destination, cheap)
 *   rAF loop → displayFrame approaches target at a CAPPED speed
 *              (cinematic motion, never a burst) → canvas draw.
 *
 * Loading model — priority order is always:
 *   visible frame → next frames → nearby ahead → next group's opening →
 *   far-ahead (fetch-only) → nothing else.
 *
 * Mobile safety (real-device constraints, not emulation):
 *   - 540px decode width  (1.9 MB/frame decoded, not 7.9)
 *   - cache budget 16     (~31 MB live bitmaps max)
 *   - max 2 concurrent decodes (phones choke on many parallel decoders)
 *   - DPR 1.0 (video footage is visually fine; GPU memory matters more)
 *   - generation tokens cancel obsolete decodes; far-behind bitmaps are
 *     explicitly closed, and the previous group is pruned on transition.
 */

export interface ManifestFrame {
  i: number;
  g: string;
  src: string;
  w: number;
  h: number;
}

export interface FrameManifest {
  version: number;
  total: number;
  aspect: number;
  groups: Array<{ id: string; title: string; start: number; count: number; w: number; h: number }>;
  chapters: Array<{ num: string; title: string; line: string; from: number; to: number }>;
  bytes: number;
  frames: ManifestFrame[];
}

interface CacheEntry {
  bitmap: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  lastUsed: number;
}

export interface FrameSequenceOptions {
  canvas?: HTMLCanvasElement;
  manifest: FrameManifest;
  /** Max simultaneously-decoded bitmaps before release kicks in. */
  cacheBudget?: number;
  /** Frames kept decoded behind the playhead (instant backwards scrub). */
  keepBehind?: number;
  /** Frames kept decoded ahead of the playhead (instant forwards step). */
  keepAhead?: number;
  /** Frames kept in flight ahead of the decoded ring. */
  lookahead?: number;
  /** Hard cap on display-frame movement per rAF tick (cinematic speed). */
  maxAdvance?: number;
  /** Max simultaneous fetch+decode jobs. */
  maxConcurrentDecodes?: number;
}

export class FrameSequence {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private manifest: FrameManifest;
  private total: number;

  /** Decoded-bitmap cache — a rolling window around the playhead. */
  private cache = new Map<number, CacheEntry>();
  private cacheBudget: number;
  private keepBehind: number;
  private keepAhead: number;
  private lookahead: number;
  private maxAdvance: number;
  private maxConcurrentDecodes: number;

  /** In-flight decode jobs — deduped by frame index. */
  private pending = new Map<number, Promise<void>>();
  /** Frames whose in-flight decode was invalidated by a generation bump. */
  private cancelled = new Set<number>();
  private failed = new Set<number>();
  /** Monotonic token: bumping it invalidates queued-but-unstarted decodes. */
  private generation = 0;

  private rafId = 0;
  private disposed = false;

  /** Scroll destination, in frames. */
  private targetFrame = 0;
  /** What the canvas is actually showing (damped, speed-capped). */
  private displayFrame = 0;
  private lastDrawnIndex = -1;

  private cssW = 1;
  private cssH = 1;
  private dpr: number;
  /** 0 = decode at native size; otherwise clamp decode width (memory safety). */
  private decodeWidth = 0;

  /** True while the playhead is moving — gates background work on phones. */
  private isPlaying = false;
  private fetchedOnly = new Set<number>();

  /** Dev diagnostics (?perf): group index + FPS live here. */
  currentGroup = 1;
  get groupCount(): number {
    return this.manifest.groups.length;
  }
  get totalFrames(): number {
    return this.total;
  }
  fps = 0;
  private fpsFrames = 0;
  private fpsLast = 0;

  /** Called every rAF with the frame being displayed — UI reads this. */
  onDisplayFrame?: (frame: number) => void;

  private onFrameBound = this.onFrame.bind(this);
  private onResizeBound = this.onResizeDebounced.bind(this);
  private resizeTimer = 0;

  constructor(opts: FrameSequenceOptions) {
    this.manifest = opts.manifest;
    this.total = opts.manifest.total;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 820;
    const navMem =
      typeof navigator !== "undefined" && "deviceMemory" in navigator
        ? (navigator as unknown as { deviceMemory?: number }).deviceMemory
        : undefined;
    const lowMem = navMem !== undefined && navMem <= 4;

    /* REAL-PHONE MEMORY MATH (decoded RGBA ≈ w×h×4):
       1080×1920 ≈ 7.9 MB/frame; 720×1280 ≈ 3.5; 540×960 ≈ 2.0.
       Budget 16 × 2.0 ≈ 31 MB live bitmaps on phones — Safari/Chrome
       Android both stay comfortable; the freeze point was 34 × 3.5 ≈ 120. */
    const mobile = isMobile || lowMem;
    this.cacheBudget = opts.cacheBudget ?? (mobile ? 16 : 56);
    this.keepBehind = opts.keepBehind ?? (mobile ? 4 : 14);
    this.keepAhead = opts.keepAhead ?? (mobile ? 7 : 18);
    this.lookahead = opts.lookahead ?? (mobile ? 5 : 22);
    this.maxConcurrentDecodes = opts.maxConcurrentDecodes ?? (mobile ? 2 : 6);
    // Cinematic catch-up cap per tick. Mobile glides a little slower.
    this.maxAdvance = opts.maxAdvance ?? (mobile ? 2 : 3);
    this.decodeWidth = mobile ? 540 : 0;
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    if (opts.canvas) this.attachCanvas(opts.canvas);
  }

  /* ── canvas binding ─────────────────────────────────────── */

  attachCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.lastDrawnIndex = -1;
    this.resize();
    window.addEventListener("resize", this.onResizeBound, { passive: true });
    window.addEventListener("orientationchange", this.onResizeBound, { passive: true });
  }

  start() {
    this.wake();
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  dispose() {
    this.disposed = true;
    this.stop();
    window.clearTimeout(this.resizeTimer);
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("orientationchange", this.onResizeBound);
    this.generation++; // invalidate everything still in flight
    for (const entry of this.cache.values()) this.releaseEntry(entry);
    this.cache.clear();
    this.pending.clear();
    this.cancelled.clear();
  }

  /* ── scrolling in (the ONLY input path) ─────────────────── */

  setProgress(p: number) {
    this.targetFrame = Math.round(Math.min(1, Math.max(0, p)) * (this.total - 1));
    this.wake();
  }

  /** Fast-forward the display frame and repaint synchronously (tests). */
  render() {
    this.displayFrame = this.targetFrame;
    this.isPlaying = false;
    const group = this.groupAt(Math.round(this.displayFrame));
    const crossed = group !== this.currentGroup;
    this.currentGroup = group;
    this.scheduleWindow(crossed);
    this.draw();
  }

  get decodedCount(): number {
    return this.cache.size;
  }

  /** Frame currently being displayed (damped, capped) — for UI/tests. */
  get frame(): number {
    return this.displayFrame;
  }

  /** Scroll destination in frames — for diagnostics. */
  get target(): number {
    return this.targetFrame;
  }

  /** Number of decodes currently in flight — for diagnostics. */
  get pendingCount(): number {
    return this.pending.size;
  }

  /* ── critical head (loader gate) ────────────────────────── */

  /** Decode the first `n` frames — the pre-roll the loader waits for. */
  async loadCritical(n: number, onProgress?: (done: number, total: number) => void): Promise<void> {
    const count = Math.min(n, this.total);
    let done = 0;
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        this.decodeFrame(i).then(() => {
          done++;
          onProgress?.(done, count);
        }),
      ),
    );
  }

  /** Compat shim: the sliding window IS the background loader. */
  queueBackground() {
    this.scheduleWindow();
  }

  get backgroundDone(): boolean {
    const start = Math.round(this.displayFrame);
    let n = 0;
    for (let i = start; i <= start + this.keepAhead; i++) if (this.cache.has(i)) n++;
    return n >= this.keepAhead;
  }

  /* ── internals: the ONE loop ────────────────────────────── */

  private wake() {
    if (!this.disposed && this.ctx && !this.rafId) {
      this.rafId = requestAnimationFrame(this.onFrameBound);
    }
  }

  private onResizeDebounced() {
    window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(() => {
      this.resize();
      this.lastDrawnIndex = -1;
      this.wake();
    }, 160);
  }

  private resize() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    const liveDpr = window.devicePixelRatio || 1;
    // Video-sourced footage on desktop: 1.5 is visually indistinguishable
    // from native while cutting fragment work ~78% vs 2.0. Phones run
    // DPR 1.0 — stable playback beats extra sharpness there.
    const eff = this.cacheBudget <= 20 ? 1.0 : Math.min(liveDpr, 1.5);
    const w = Math.round(this.cssW * eff);
    const h = Math.round(this.cssH * eff);
    // Only touch the backing store when the size actually changed —
    // assigning canvas.width destroys the buffer and forces re-raster.
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  }

  private onFrame(now: number) {
    if (this.disposed) return;

    this.fpsFrames++;
    if (now - this.fpsLast >= 1000) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLast));
      this.fpsFrames = 0;
      this.fpsLast = now;
    }

    /* Cinematic catch-up toward the scroll target, speed-capped. */
    const diff = this.targetFrame - this.displayFrame;
    if (diff !== 0) {
      if (Math.abs(diff) < 0.999) this.displayFrame = this.targetFrame;
      else {
        const step = Math.sign(diff) * Math.min(Math.abs(diff) * 0.12, this.maxAdvance);
        this.displayFrame += step;
      }
      if (this.displayFrame < 0) this.displayFrame = 0;
      if (this.displayFrame > this.total - 1) this.displayFrame = this.total - 1;
    }
    this.isPlaying = Math.abs(this.targetFrame - this.displayFrame) >= 0.5;

    const shown = Math.round(this.displayFrame);
    if (shown !== this.lastDrawnIndex) {
      const group = this.groupAt(shown);
      const crossedGroup = group !== this.currentGroup;
      this.currentGroup = group;
      this.scheduleWindow(crossedGroup); // prune the old group on crossing
      this.draw();
      this.onDisplayFrame?.(shown);
    }

    /* Sleep when settled, the window is complete, and nothing is in
       flight — NOT merely when pending === 0 (a half-filled window with
       dropped decodes used to sleep forever: the real-phone freeze). */
    const head = Math.round(this.displayFrame);
    let windowMissing = false;
    for (let i = head; i <= head + this.keepAhead; i++) {
      if (!this.cache.has(i) && !this.failed.has(i)) {
        windowMissing = true;
        break;
      }
    }
    if (!this.isPlaying && this.pending.size === 0 && this.deferred.length === 0 && !windowMissing) {
      this.rafId = 0;
      return;
    }
    if (windowMissing && this.pending.size === 0) this.scheduleWindow();
    this.rafId = requestAnimationFrame(this.onFrameBound);
  }

  /* ── internals: sliding decode window ───────────────────── */

  private groupAt(frame: number): number {
    const groups = this.manifest.groups;
    for (let g = 0; g < groups.length; g++) {
      const grp = groups[g];
      if (frame < grp.start + grp.count) return g + 1;
    }
    return groups.length;
  }

  /** Pre-roll the NEXT group's opening frames before the boundary arrives. */
  private boundaryPreroll(): number[] {
    const playhead = Math.round(this.displayFrame);
    const groups = this.manifest.groups;
    for (let g = 0; g < groups.length - 1; g++) {
      const boundary = groups[g].start + groups[g].count;
      if (playhead >= boundary - this.lookahead - 2 && playhead < boundary) {
        const out: number[] = [];
        const end = Math.min(this.total - 1, boundary + Math.max(6, this.keepAhead));
        for (let i = boundary; i <= end; i++) out.push(i);
        return out;
      }
    }
    return [];
  }

  /**
   * Re-anchor the decode window at the playhead.
   * Priority: current → inner ahead ring → next-group pre-roll → behind
   * ring. Far-ahead frames are FETCH-ONLY. When a group transition just
   * happened, the previous group's bitmaps are released immediately so two
   * sequences never sit decoded in memory at once.
   */
  private scheduleWindow(justCrossedGroup = false) {
    if (this.disposed) return;
    const head = Math.round(this.displayFrame);
    const order: number[] = [];

    for (let i = head; i <= Math.min(this.total - 1, head + this.keepAhead); i++) order.push(i);
    order.push(...this.boundaryPreroll());
    for (let i = head - 1; i >= Math.max(0, head - this.keepBehind); i--) order.push(i);

    /* Two sequences must never be decoded simultaneously: on a crossing,
       keep only the last few frames of the old group as overlap. */
    if (justCrossedGroup) this.pruneToOverlap(head);

    for (const i of order) {
      if (this.cache.has(i)) continue;
      if (this.pending.has(i) || this.failed.has(i)) continue;
      if (i > head + this.keepAhead + 12) {
        this.fetchOnly(i); // warm HTTP cache; never decode far-ahead frames
        continue;
      }
      void this.decodeFrame(i);
    }

    this.releaseBehind();
  }

  /**
   * Release every decoded frame outside [head - overlapBehind, head +
   * overlapAhead]. Called on group crossings; also keeps ordinary windows
   * honest on memory-tight devices.
   */
  private pruneToOverlap(head: number) {
    const behind = Math.max(2, this.keepBehind);
    const ahead = Math.max(this.keepAhead, 8);
    for (const [i, entry] of this.cache) {
      if (i < head - behind || i > head + ahead) {
        this.releaseEntry(entry);
        this.cache.delete(i);
      }
    }
    this.generation++; // any decode that now lands outside the window is moot
  }

  private releaseBehind() {
    const floor = Math.round(this.displayFrame) - this.keepBehind - 3;
    for (const [i, entry] of this.cache) {
      if (i < floor) {
        this.releaseEntry(entry);
        this.cache.delete(i);
      }
    }
    // Hard budget: drop least-recently-used, protecting the playhead.
    if (this.cache.size > this.cacheBudget) {
      const sorted = [...this.cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      let excess = this.cache.size - this.cacheBudget;
      for (const [i, entry] of sorted) {
        if (excess-- <= 0) break;
        if (Math.abs(i - this.displayFrame) <= 2) continue;
        this.releaseEntry(entry);
        this.cache.delete(i);
      }
    }
  }

  /** Warm the HTTP cache for a far-ahead frame without decoding it. */
  private fetchOnly(index: number) {
    if (index >= this.total || this.fetchedOnly.has(index)) return;
    const frame = this.manifest.frames[index];
    if (!frame) return;
    this.fetchedOnly.add(index);
    void fetch(frame.src, { mode: "same-origin" }).catch(() => {
      this.fetchedOnly.delete(index);
    });
  }

  /** Frames the window wants but the concurrency cap deferred. */
  private deferred: number[] = [];

  /** Fetch + decode one frame. Deduped, retried once, generation-guarded. */
  private async decodeFrame(index: number): Promise<void> {
    if (index < 0 || index >= this.total) return;
    if (this.cache.has(index) || this.failed.has(index)) return;
    const inflight = this.pending.get(index);
    if (inflight) return inflight;
    // HARD CONCURRENCY CAP: the mobile decoder chokes on parallel decodes.
    // Overflow is DEFERRED (a queue), never dropped — dropped requests are
    // what starved the window on real phones.
    if (this.pending.size >= this.maxConcurrentDecodes) {
      if (!this.deferred.includes(index)) this.deferred.push(index);
      return;
    }
    const myGeneration = this.generation;
    const task = this.decodeUncached(index, myGeneration).finally(() => {
      this.pending.delete(index);
      this.pumpDeferred();
    });
    this.pending.set(index, task);
    return task;
  }

  /** Start the next deferred decode when a slot frees up. */
  private pumpDeferred() {
    if (this.disposed) return;
    while (
      this.deferred.length > 0 &&
      this.pending.size < this.maxConcurrentDecodes
    ) {
      const next = this.deferred.shift()!;
      // Skip work the playhead no longer wants.
      if (this.cache.has(next) || this.failed.has(next)) continue;
      if (Math.abs(next - Math.round(this.displayFrame)) > this.keepAhead + 20) continue;
      const myGeneration = this.generation;
      const task = this.decodeUncached(next, myGeneration).finally(() => {
        this.pending.delete(next);
        this.pumpDeferred();
      });
      this.pending.set(next, task);
    }
  }

  private async decodeUncached(index: number, myGeneration: number): Promise<void> {
    const frame = this.manifest.frames[index];
    if (!frame) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(frame.src, { mode: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();

        if (this.disposed) return;
        // Obsolete work: playhead moved on, or its window generation ended.
        const distance = Math.abs(index - Math.round(this.displayFrame));
        if (
          myGeneration !== this.generation ||
          this.cancelled.has(index) ||
          distance > this.keepAhead + 20
        ) {
          this.cancelled.delete(index);
          return; // bytes are in the HTTP cache; re-decode is cheap if needed
        }

        let entry: CacheEntry;
        if (typeof createImageBitmap === "function") {
          const resize =
            this.decodeWidth && frame.w > this.decodeWidth
              ? { resizeWidth: this.decodeWidth, resizeQuality: "medium" as ResizeQuality }
              : undefined;
          const bitmap = resize ? await createImageBitmap(blob, resize) : await createImageBitmap(blob);
          if (myGeneration !== this.generation || this.disposed) {
            // Never let a stale decode commit memory into the new window.
            if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();
            return;
          }
          entry = { bitmap, width: bitmap.width, height: bitmap.height, lastUsed: performance.now() };
        } else {
          const url = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("decode failed"));
            img.src = url;
          });
          if (myGeneration !== this.generation || this.disposed) return;
          entry = { bitmap: img, width: img.naturalWidth, height: img.naturalHeight, lastUsed: performance.now() };
        }
        this.cache.set(index, entry);
        this.lastDrawnIndex = -1; // the wanted frame may have just landed
        this.wake();
        return;
      } catch {
        if (attempt === 1) {
          this.failed.add(index);
          window.setTimeout(() => {
            this.failed.delete(index);
            this.wake(); // re-arm the loop so the window can re-schedule
          }, 2500);
        } else {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }
  }

  /* ── rendering ──────────────────────────────────────────── */

  private releaseEntry(entry: CacheEntry) {
    if ("close" in entry.bitmap && typeof entry.bitmap.close === "function") {
      try {
        entry.bitmap.close();
      } catch {
        /* already closed */
      }
    }
  }

  private pick(index: number): (CacheEntry & { index: number }) | undefined {
    if (this.cache.has(index)) {
      const e = this.cache.get(index)!;
      e.lastUsed = performance.now();
      return { ...e, index };
    }
    for (let d = 1; d <= 8; d++) {
      if (this.cache.has(index - d)) {
        const e = this.cache.get(index - d)!;
        e.lastUsed = performance.now();
        return { ...e, index: index - d };
      }
      if (this.cache.has(index + d)) {
        const e = this.cache.get(index + d)!;
        e.lastUsed = performance.now();
        return { ...e, index: index + d };
      }
    }
    return undefined;
  }

  /** The last frame index we successfully painted (fallback anchor). */
  private lastGoodFrame = -1;

  private draw() {
    if (!this.ctx || !this.canvas) return;
    const clamped = Math.min(this.total - 1, Math.max(0, Math.round(this.displayFrame)));
    let pick = this.pick(clamped);
    /* NEVER freeze: if the wanted frame isn't decoded yet, hold the last
       good frame on screen (a held frame, not a blank/stuck canvas). */
    if (!pick && this.lastGoodFrame >= 0 && this.cache.has(this.lastGoodFrame)) {
      pick = this.pick(this.lastGoodFrame);
    }
    if (!pick) return; // nothing at all decoded yet — stay dark
    if (clamped === this.lastDrawnIndex && this.lastGoodFrame === clamped) return;

    if (pick.index === clamped) this.lastGoodFrame = clamped;

    const { bitmap, width, height } = pick;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    // 9:16 source cover-crop — never stretch.
    const scale = Math.max(cw / width, ch / height);
    const dw = width * scale;
    const dh = height * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    this.ctx.fillStyle = "#0b0a08";
    this.ctx.fillRect(0, 0, cw, ch);
    try {
      this.ctx.drawImage(bitmap, dx, dy, dw, dh);
    } catch {
      return;
    }
    this.lastDrawnIndex = clamped;
  }
}
