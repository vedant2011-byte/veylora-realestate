/** Small shared utilities. */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const inr = (n: number): string => {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(0)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const sqft = (n: number): string => `${n.toLocaleString("en-IN")} sq.ft.`;

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const INSTAGRAM_URL =
  "https://www.instagram.com/veylora_.1?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==";
