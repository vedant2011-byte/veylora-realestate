/**
 * Favorites + compare state, persisted in localStorage (demo prototype — no
 * login). A tiny pub-sub keeps every mounted page in sync instantly.
 */
import { useSyncExternalStore } from "react";

const FAV_KEY = "veylora:favorites";
const CMP_KEY = "veylora:compare";
const MAX_COMPARE = 3;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === FAV_KEY || e.key === CMP_KEY) emit();
  });
}

function read(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode — state still works in-memory for the session */
  }
  emit();
}

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  return read(FAV_KEY);
}

export function toggleFavorite(slug: string) {
  const cur = getFavorites();
  write(FAV_KEY, cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
}

export function useFavorites(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getFavorites().join("|"),
    () => "",
  ).split("|").filter(Boolean);
}

/* ── Compare ─────────────────────────────────────────────── */

export function getCompare(): string[] {
  if (typeof window === "undefined") return [];
  return read(CMP_KEY);
}

export const MAX_COMPARE_SLOTS = MAX_COMPARE;

export function toggleCompare(slug: string): "added" | "removed" | "full" {
  const cur = getCompare();
  if (cur.includes(slug)) {
    write(CMP_KEY, cur.filter((s) => s !== slug));
    return "removed";
  }
  if (cur.length >= MAX_COMPARE) return "full";
  write(CMP_KEY, [...cur, slug]);
  return "added";
}

export function clearCompare() {
  write(CMP_KEY, []);
}

export function useCompare(): string[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => getCompare().join("|"),
    () => "",
  ).split("|").filter(Boolean);
}
