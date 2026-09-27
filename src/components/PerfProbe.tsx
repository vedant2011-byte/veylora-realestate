"use client";

import { useEffect } from "react";
import { startPerfMonitor } from "@/lib/perf";

/** Diagnostic-only FPS HUD. Renders nothing unless the URL contains ?perf. */
export default function PerfProbe() {
  useEffect(() => startPerfMonitor("site"), []);
  return null;
}
