interface FilmProbe {
  currentGroup: number;
  groupCount: number;
  frame: number;
  target: number;
  totalFrames: number;
  decodedCount: number;
  pendingCount: number;
}

/**
 * Opt-in frame-rate monitor for performance diagnostics.
 *
 * Active ONLY when the URL contains `?perf` — normal users never see it.
 * Renders a small fixed HUD with FPS, canvas count, DPR and (when the film
 * engine is present) decoded-frame count. Useful for verifying real frame
 * pacing on target hardware, where GPU utilization alone is misleading.
 */
export function startPerfMonitor(label = "site"): () => void {
  if (typeof window === "undefined") return () => {};
  if (!window.location.search.includes("perf")) return () => {};

  let frames = 0;
  let last = performance.now();
  let raf = 0;

  const el = document.createElement("div");
  const seq = () => (window as unknown as { __veydoraSeq?: FilmProbe }).__veydoraSeq;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;left:10px;bottom:10px;z-index:99999;background:rgba(12,10,8,.88);" +
    "color:#f6f1e8;font:11px/1.6 ui-monospace,SFMono-Regular,monospace;padding:6px 10px;" +
    "border-radius:8px;pointer-events:none;white-space:pre";
  document.body.appendChild(el);

  const loop = (t: number) => {
    frames++;
    if (t - last >= 1000) {
      const fps = Math.round((frames * 1000) / (t - last));
      const s = seq();
      const lines = [`${label}  ${fps} fps`];
      if (s) {
        lines.push(
          `sequence  ${s.currentGroup} / ${s.groupCount}`,
          `global frame  ${Math.round(s.frame)} / ${s.totalFrames}`,
          `target frame  ${Math.round(s.target)}`,
          `decoded  ${s.decodedCount}`, // sliding-window size
          `pending decodes  ${s.pendingCount}`,
        );
      } else {
        lines.push(`canvases  ${document.querySelectorAll("canvas").length}`, `dpr  ${window.devicePixelRatio}`);
      }
      el.textContent = lines.join("\n");
      frames = 0;
      last = t;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    el.remove();
  };
}
