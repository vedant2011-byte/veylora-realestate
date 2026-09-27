/**
 * FrameSequence — the cinematic scroll-driven frame player (v2).
 *
 * Built for the 809-frame master library (5 groups, 9:16 throughout).
 *
 * Architecture:
 *  - Manifest-driven: frame paths come from src/data/frame-manifest.json.
 *  - Rolling cache: keeps decoded bitmaps for frames near the playhead and
 *    releases distant ones when the budget is exceeded (memory safety on
 *    phones). Compressed bytes stay in the HTTP cache; re-decode is cheap.
 *  - Priority queue: the playhead's neighbourhood always decodes first;
 *    the rest of the library continues loading in the background.
 *  - Damped playback: scroll targets are approached smoothly every rAF;
 *    render() can fast-forward synchronously (loader handover, tests).
 *  - Never renders white: the canvas is initialized dark and draw() always
 *    paints a frame (nearest ready neighbour) before anything shows.
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
  /** Max simultaneously-decoded bitmaps before the cache starts evicting. */
  cacheBudget?: number;
  /** How many frames on each side of the playhead are always kept decoded. */
  keepNear?: number;
}

export class FrameSequence {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private manifest: FrameManifest;
  private total: number;

  /** Decoded-bitmap cache with LRU eviction. */
  private cache = new Map<number, CacheEntry>();
  private cacheBudget: number;
  private keepNear: number;

  /** In-flight decode jobs — deduped by frame index. */
  private pending = new Map<number, Promise<void>>();
  /** Frames whose fetch/decode failed permanently after retries. */
  private failed = new Set<number>();
  /** Highest contiguous frame decoded from the very start. */
  private contiguousReady = 0;

  /** Explicit order for background prefetch (set by queueBackground). */
  private backgroundOrder: number[] = [];
  private backgroundCursor = 0;
  private idleScheduled = false;

  private rafId = 0;
  private disposed = false;

  private target = 0;
  private current = 0;
  private lastDrawnIndex = -1;
  private drawnWasFallback = false;
  private needsRedraw = true;

  private cssW = 1;
  private cssH = 1;
  private dpr: number;
  /** 0 = decode at native size; otherwise clamp decode width (memory safety). */
  private decodeWidth = 0;

  private onFrameBound = this.onFrame.bind(this);
  private onResizeBound = this.onResize.bind(this);

  constructor(opts: FrameSequenceOptions) {
    this.manifest = opts.manifest;
    this.total = opts.manifest.total;
    // 1080×1920 RGBA ≈ 8.3MB per decoded bitmap — budgets are sized so the
    // worst case stays well under a few hundred MB even on phones.
    const isMobile = typeof window !== "undefined" && window.innerWidth < 820;
    const navMem =
      typeof navigator !== "undefined" && "deviceMemory" in navigator
        ? (navigator as unknown as { deviceMemory?: number }).deviceMemory
        : undefined;
    this.cacheBudget = opts.cacheBudget ?? (isMobile ? 40 : navMem && navMem <= 4 ? 36 : 64);
    this.keepNear = opts.keepNear ?? (isMobile ? 20 : 32);
    // Phones & low-memory devices decode at 720px wide — 4× less bitmap
    // memory, visually lossless at phone canvas sizes.
    this.decodeWidth = isMobile || (navMem !== undefined && navMem <= 4) ? 720 : 0;
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
    this.drawnWasFallback = false;
    this.needsRedraw = true;
    this.resize();
    window.addEventListener("resize", this.onResizeBound, { passive: true });
    window.addEventListener("orientationchange", this.onResizeBound, { passive: true });
  }

  start() {
    if (this.rafId || !this.ctx) return;
    this.rafId = requestAnimationFrame(this.onFrameBound);
  }

  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /** Request a frame if the loop is asleep (scroll, resize, decode landed). */
  private wake() {
    if (!this.disposed && this.ctx && !this.rafId) {
      this.rafId = requestAnimationFrame(this.onFrameBound);
    }
  }

  dispose() {
    this.disposed = true;
    this.stop();
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("orientationchange", this.onResizeBound);
    for (const entry of this.cache.values()) this.releaseEntry(entry);
    this.cache.clear();
    this.pending.clear();
  }

  /* ── loading ────────────────────────────────────────────── */

  /** Fetch + decode one frame into the cache. Deduped, retried once. */
  private async decodeFrame(index: number): Promise<void> {
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
        let entry: CacheEntry;
        if (typeof createImageBitmap === "function") {
          const resize =
            this.decodeWidth && frame.w > this.decodeWidth
              ? { resizeWidth: this.decodeWidth, resizeQuality: "medium" as ResizeQuality }
              : undefined;
          const bitmap = resize
            ? await createImageBitmap(blob, resize)
            : await createImageBitmap(blob);
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
        this.admit(index, entry);
        if (index === this.contiguousReady) {
          while (this.contiguousReady < this.total && this.cache.has(this.contiguousReady)) {
            this.contiguousReady++;
          }
        }
        this.needsRedraw = true;
        this.wake(); // a missed frame may have just become available
        return;
      } catch {
        if (attempt === 1) {
          this.failed.add(index);
          // One slow retry after a beat — transient network faults recover.
          window.setTimeout(() => {
            this.failed.delete(index);
            void this.decodeFrame(index);
          }, 2000);
        } else {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
    }
  }

  private admit(index: number, entry: CacheEntry) {
    this.evictIfNeeded(index);
    this.cache.set(index, entry);
  }

  private releaseEntry(entry: CacheEntry) {
    if ("close" in entry.bitmap && typeof entry.bitmap.close === "function") {
      try {
        entry.bitmap.close();
      } catch {
        /* noop */
      }
    }
  }

  /** LRU eviction that never touches the playhead's near-neighbourhood. */
  private evictIfNeeded(incoming: number) {
    if (this.cache.size < this.cacheBudget) return;
    const near = new Set<number>();
    for (let d = 0; d <= this.keepNear; d++) {
      near.add(incoming + d);
      near.add(incoming - d);
    }
    const candidates = [...this.cache.entries()]
      .filter(([i]) => !near.has(i))
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
    let toEvict = this.cache.size - this.cacheBudget + 1;
    for (const [i, entry] of candidates) {
      if (toEvict-- <= 0) break;
      this.releaseEntry(entry);
      this.cache.delete(i);
    }
  }

  /** Decode the first `n` frames — the critical pre-roll for the loader. */
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
   * Queue everything after the critical set for background decoding, in
   * playhead-order. The queue drains opportunistically (see pump()).
   */
  queueBackground() {
    this.backgroundOrder = Array.from({ length: this.total }, (_, i) => i).filter(
      (i) => !this.cache.has(i),
    );
    this.backgroundCursor = 0;
    this.scheduleIdle();
  }

  /**
   * Drain the background queue in idle time, away from the playback loop —
   * decoding competes with scroll rendering for the main thread. A slow
   * drip (4 frames per idle slot) keeps scrolling butter-smooth while the
   * 809-frame library still finishes in the background.
   */
  private scheduleIdle() {
    if (this.disposed || this.idleScheduled) return;
    if (this.backgroundCursor >= this.backgroundOrder.length) return;
    this.idleScheduled = true;
    const ric = (
      window as unknown as {
        requestIdleCallback?: (f: () => void) => void;
      }
    ).requestIdleCallback;
    const step = () => {
      this.idleScheduled = false;
      if (this.disposed) return;
      this.pump(4);
      if (this.backgroundCursor < this.backgroundOrder.length) this.scheduleIdle();
    };
    if (typeof ric === "function") ric(step);
    else window.setTimeout(step, 300);
  }

  /** Drain a few background frames. Public for tests/integration. */
  pump(max = 3): number {
    let pumped = 0;
    while (pumped < max && this.backgroundCursor < this.backgroundOrder.length) {
      const i = this.backgroundOrder[this.backgroundCursor++];
      void this.decodeFrame(i);
      pumped++;
    }
    return pumped;
  }

  get backgroundDone(): boolean {
    return this.backgroundCursor >= this.backgroundOrder.length;
  }

  /** Legacy API kept for the loader: load every frame, reporting progress. */
  async loadFrames(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    let done = 0;
    await Promise.all(
      Array.from({ length: this.total }, (_, i) =>
        this.decodeFrame(i).then(() => {
          done++;
          onProgress?.(done, this.total);
        }),
      ),
    );
  }

  /* ── playback ───────────────────────────────────────────── */

  setProgress(p: number) {
    this.target = Math.min(1, Math.max(0, p));
    // Warm the playhead neighbourhood with priority.
    const center = Math.round(this.target * (this.total - 1));
    for (let d = 0; d <= 6; d++) {
      void this.decodeFrame(center + d);
      if (d) void this.decodeFrame(center - d);
    }
    this.wake(); // scroll fired while the loop was asleep
  }

  /** Fast-forward the smoothed value and repaint synchronously. */
  render() {
    this.current = this.target;
    this.draw();
  }

  get decodedCount(): number {
    return this.cache.size;
  }

  /* ── internals ──────────────────────────────────────────── */

  private onResize() {
    this.resize();
    this.needsRedraw = true;
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

  private onFrame() {
    if (this.disposed) return;
    // Damped approach toward the scroll target.
    const diff = this.target - this.current;
    const epsilon = 0.00008;
    if (Math.abs(diff) > epsilon) {
      this.current += diff * 0.14;
    } else {
      this.current = this.target;
    }
    this.draw();
    // Sleep when the playhead has settled and nothing is in flight — the
    // next scroll / resize / decode completion wakes us via wake(). An
    // always-on loop burns 60–144 wakeups/s for an unmoving image.
    const settled = Math.abs(diff) <= epsilon;
    if (settled && this.pending.size === 0) {
      this.rafId = 0;
      return;
    }
    this.rafId = requestAnimationFrame(this.onFrameBound);
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

  private draw() {
    if (!this.ctx || !this.canvas) return;
    const idx = Math.round(this.current * (this.total - 1));
    const clamped = Math.min(this.total - 1, Math.max(0, idx));
    const pick = this.pick(clamped);
    if (!pick) return; // nothing decoded yet — stay dark
    const isFallback = pick.index !== clamped;
    if (!this.needsRedraw && !isFallback && clamped === this.lastDrawnIndex) return;

    const { bitmap, width, height } = pick;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    // 9:16 source cover-crop — never stretch.
    const scale = Math.max(cw / width, ch / height);
    const dw = width * scale;
    const dh = height * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    if (clamped !== this.lastDrawnIndex || isFallback) {
      this.ctx.fillStyle = "#0b0a08";
      this.ctx.fillRect(0, 0, cw, ch);
    }
    try {
      this.ctx.drawImage(bitmap, dx, dy, dw, dh);
    } catch {
      return;
    }
    this.lastDrawnIndex = clamped;
    this.needsRedraw = isFallback; // latch: repaint when the real frame lands
    this.drawnWasFallback = isFallback;
  }
}
