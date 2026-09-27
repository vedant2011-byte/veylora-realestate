/**
 * FrameSequence — the cinematic scroll-driven frame player (v3).
 *
 * One engine, one film, one rAF loop. The 809-frame library (5 groups) is
 * treated as a single global timeline: the renderer thinks in globalFrame
 * and never "switches scenes".
 *
 * Playback model:
 *   scroll → targetFrame (destination, cheap)
 *   rAF loop → displayedFrame approaches target at a CAPPED speed
 *              (cinematic motion, never a burst) → canvas draw.
 *
 * Loading model — a sliding decode window anchored at the display frame:
 *   - near ring behind/ahead stays decoded (instant scrub both ways)
 *   - an ahead-of-playhead band is kept in flight (lookahead)
 *   - far-ahead frames are FETCHED only (browser cache warm) when idle
 *   - approaching a group boundary pre-rolls the next group's first frames
 *   - obsolete decodes (now far behind the playhead) are skipped
 *   - far-behind bitmaps are released to the HTTP cache
 *
 * The visible frame ALWAYS paints (nearest decoded neighbour) — playback
 * never blocks on a decode; the frame resolves the moment it lands.
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

  /** In-flight decode jobs — deduped by frame index, skippable by age. */
  private pending = new Map<number, Promise<void>>();
  private skipped = new Set<number>();
  private failed = new Set<number>();

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
  private onResizeBound = this.onResize.bind(this);

  constructor(opts: FrameSequenceOptions) {
    this.manifest = opts.manifest;
    this.total = opts.manifest.total;
    // 1080×1920 RGBA ≈ 8.3MB per decoded bitmap — the window keeps the
    // worst case well under a few hundred MB even on phones.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 820;
    const navMem =
      typeof navigator !== "undefined" && "deviceMemory" in navigator
        ? (navigator as unknown as { deviceMemory?: number }).deviceMemory
        : undefined;
    const lowMem = navMem !== undefined && navMem <= 4;

    this.cacheBudget = opts.cacheBudget ?? (isMobile ? 34 : lowMem ? 30 : 56);
    this.keepBehind = opts.keepBehind ?? (isMobile ? 10 : 14);
    this.keepAhead = opts.keepAhead ?? (isMobile ? 14 : 18);
    this.lookahead = opts.lookahead ?? (isMobile ? 14 : 22);
    // Cinematic catch-up: 3 frames/tick desktop, 2 on mobile. A huge scroll
    // becomes a smooth ~1–1.8s glide instead of an instant teleport.
    this.maxAdvance = opts.maxAdvance ?? (isMobile ? 2 : 3);
    // Phones & low-memory devices decode at 720px wide — 4× less bitmap
    // memory, visually lossless at phone canvas sizes.
    this.decodeWidth = isMobile || lowMem ? 720 : 0;
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
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("orientationchange", this.onResizeBound);
    for (const entry of this.cache.values()) this.releaseEntry(entry);
    this.cache.clear();
    this.pending.clear();
    this.skipped.clear();
  }

  /* ── scrolling in (the ONLY input path) ─────────────────── */

  setProgress(p: number) {
    this.targetFrame = Math.round(Math.min(1, Math.max(0, p)) * (this.total - 1));
    this.wake(); // scroll fired while the loop was asleep
  }

  /** Fast-forward the display frame and repaint synchronously (tests). */
  render() {
    this.displayFrame = this.targetFrame;
    this.scheduleWindow();
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

  /**
   * Compat shim: the sliding window IS the background loader. Calling it
   * simply primes the window around the current playhead; nothing else is
   * decoded until the playhead asks for it.
   */
  queueBackground() {
    this.scheduleWindow();
  }

  get backgroundDone(): boolean {
    // With a true rolling window there is no "all decoded" state; report
    // the window as saturated once the ahead band is fully in flight.
    const ahead = this.decodedAhead();
    return ahead >= this.keepAhead;
  }

  private decodedAhead(): number {
    const start = Math.round(this.displayFrame);
    let n = 0;
    for (let i = start; i <= start + this.keepAhead; i++) if (this.cache.has(i)) n++;
    return n;
  }

  /* ── internals: the ONE loop ────────────────────────────── */

  private releaseEntry(entry: CacheEntry) {
    if ("close" in entry.bitmap && typeof entry.bitmap.close === "function") {
      try {
        entry.bitmap.close();
      } catch {
        /* already closed */
      }
    }
  }

  /** Request a frame if the loop is asleep (scroll, resize, decode landed). */
  private wake() {
    if (!this.disposed && this.ctx && !this.rafId) {
      this.rafId = requestAnimationFrame(this.onFrameBound);
    }
  }

  private onResize() {
    this.resize();
    this.lastDrawnIndex = -1; // backing store changed — force repaint
    this.wake();
  }

  private resize() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.cssW = Math.max(1, rect.width);
    this.cssH = Math.max(1, rect.height);
    const liveDpr = window.devicePixelRatio || 1;
    this.dpr = liveDpr;
    // Video-sourced footage: 1.5 is visually indistinguishable from native
    // DPR on any panel while cutting fragment work by up to ~78% vs 2.0.
    const cap = Math.min(liveDpr, 1.5);
    const w = Math.round(this.cssW * cap);
    const h = Math.round(this.cssH * cap);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
  }

  private onFrame(now: number) {
    if (this.disposed) return;

    /* FPS diagnostics (used by the ?perf HUD). */
    this.fpsFrames++;
    if (now - this.fpsLast >= 1000) {
      this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsLast));
      this.fpsFrames = 0;
      this.fpsLast = now;
    }

    /* Cinematic catch-up: approach the scroll target at a capped speed.
       0.12 damping keeps motion organic; maxAdvance bounds it absolutely —
       a wild scroll glides, it never bursts. */
    const diff = this.targetFrame - this.displayFrame;
    if (diff !== 0) {
      const step = Math.abs(diff) <= 1 ? diff : Math.sign(diff) * Math.min(Math.abs(diff) * 0.12, this.maxAdvance);
      if (Math.abs(diff) < 0.999) this.displayFrame = this.targetFrame;
      else this.displayFrame += step;
      if (this.displayFrame < 0) this.displayFrame = 0;
      if (this.displayFrame > this.total - 1) this.displayFrame = this.total - 1;
    }

    const shown = Math.round(this.displayFrame);
    if (shown !== this.lastDrawnIndex) {
      this.currentGroup = this.groupAt(shown);
      this.scheduleWindow(); // slide the decode window to the new playhead
      this.draw();
      this.onDisplayFrame?.(shown);
    }

    /* Sleep when settled and nothing is in flight; wake() re-arms us. */
    const settled = Math.abs(this.targetFrame - this.displayFrame) < 0.5;
    if (settled && this.pending.size === 0) {
      this.rafId = 0;
      return;
    }
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
      if (playhead >= boundary - this.lookahead && playhead < boundary) {
        const out: number[] = [];
        const end = Math.min(this.total - 1, boundary + 17);
        for (let i = boundary; i <= end; i++) out.push(i);
        return out;
      }
    }
    return [];
  }

  /**
   * Re-anchor the decode window at the playhead:
   *   behind ring (decoded) | playhead | ahead band (decoded+in flight)
   * Priority: current frame → inner ring outward → boundary pre-roll.
   * Far-ahead frames are fetch-only. Obsolete in-flight decodes are skipped.
   */
  private scheduleWindow() {
    if (this.disposed) return;
    const head = Math.round(this.displayFrame);
    const order: number[] = [];

    /* 1. Ahead band — the frames the film is about to need. */
    for (let i = head; i <= Math.min(this.total - 1, head + this.keepAhead + this.lookahead); i++) {
      order.push(i);
    }

    /* 2. Behind ring — instant backwards scrub. */
    for (let i = head - 1; i >= Math.max(0, head - this.keepBehind); i--) {
      order.push(i);
    }

    /* 3. Boundary pre-roll — the next sequence's opening, early. */
    order.push(...this.boundaryPreroll());

    let inner = 0;
    let scheduled = 0;
    for (const i of order) {
      if (this.cache.has(i)) continue;
      const isAhead = i > head;
      if (isAhead && inner >= this.lookahead) {
        this.fetchOnly(i); // warm the HTTP cache without spending decode
        continue;
      }
      if (isAhead) inner++;
      if (this.pending.has(i) || this.failed.has(i)) continue;
      void this.decodeFrame(i);
      scheduled++;
      if (scheduled >= this.lookahead + 4) break; // bounded in-flight set
    }

    this.releaseBehind();
  }

  /**
   * Drop bitmaps far behind the playhead (bytes stay in the HTTP cache,
   * so a fast backwards scrub re-decodes locally instead of re-downloading).
   */
  private releaseBehind() {
    const floor = Math.round(this.displayFrame) - this.keepBehind - 4;
    if (this.cache.size <= this.cacheBudget) {
      // Even under budget, release clearly-obsolete far-behind entries.
      for (const [i, entry] of this.cache) {
        if (i < floor) {
          this.releaseEntry(entry);
          this.cache.delete(i);
        }
      }
      return;
    }
    const sorted = [...this.cache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    let excess = this.cache.size - this.cacheBudget;
    for (const [i, entry] of sorted) {
      if (excess-- <= 0) break;
      if (Math.abs(i - this.displayFrame) <= 2) continue; // protect playhead
      this.releaseEntry(entry);
      this.cache.delete(i);
    }
  }

  /** Warm the HTTP cache for a far-ahead frame without decoding it. */
  private fetchedOnly = new Set<number>();
  private fetchOnly(index: number) {
    if (index >= this.total || this.fetchedOnly.has(index)) return;
    const frame = this.manifest.frames[index];
    if (!frame) return;
    this.fetchedOnly.add(index);
    void fetch(frame.src, { mode: "same-origin" }).catch(() => {
      this.fetchedOnly.delete(index); // retryable later
    });
  }

  /** Fetch + decode one frame. Deduped, retried once, skippable if stale. */
  private async decodeFrame(index: number): Promise<void> {
    if (index < 0 || index >= this.total) return;
    if (this.cache.has(index) || this.failed.has(index)) return;
    const inflight = this.pending.get(index);
    if (inflight) return inflight;
    const task = this.decodeUncached(index).finally(() => this.pending.delete(index));
    this.pending.set(index, task);
    return task;
  }

  private async decodeUncached(index: number): Promise<void> {
    const frame = this.manifest.frames[index];
    if (!frame) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(frame.src, { mode: "same-origin" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();

        /* The playhead moved on while we fetched — don't spend the main
           thread decoding a frame nobody needs anymore (it stays in the
           HTTP cache and decodes instantly if the user scrolls back). */
        if (Math.abs(index - Math.round(this.displayFrame)) > this.keepAhead + 26) {
          this.skipped.add(index);
          return;
        }

        let entry: CacheEntry;
        if (typeof createImageBitmap === "function") {
          const resize =
            this.decodeWidth && frame.w > this.decodeWidth
              ? { resizeWidth: this.decodeWidth, resizeQuality: "medium" as ResizeQuality }
              : undefined;
          const bitmap = resize ? await createImageBitmap(blob, resize) : await createImageBitmap(blob);
          entry = { bitmap, width: bitmap.width, height: bitmap.height, lastUsed: performance.now() };
        } else {
          const url = URL.createObjectURL(blob);
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("decode failed"));
            img.src = url;
          });
          entry = { bitmap: img, width: img.naturalWidth, height: img.naturalHeight, lastUsed: performance.now() };
        }
        if (this.disposed) return;
        this.cache.set(index, entry);
        this.lastDrawnIndex = -1; // a wanted frame may have just landed
        this.wake(); // repaint if the loop was sleeping
        return;
      } catch {
        if (attempt === 1) {
          this.failed.add(index);
          // One slow retry after a beat — transient faults recover.
          window.setTimeout(() => {
            this.failed.delete(index);
          }, 2500);
        } else {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }
  }

  /* ── rendering ──────────────────────────────────────────── */

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

  private draw() {
    if (!this.ctx || !this.canvas) return;
    const clamped = Math.min(this.total - 1, Math.max(0, Math.round(this.displayFrame)));
    const pick = this.pick(clamped);
    if (!pick) return; // nothing decoded yet — stay dark
    if (clamped === this.lastDrawnIndex) return;

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
