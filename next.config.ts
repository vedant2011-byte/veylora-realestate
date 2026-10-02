import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(import.meta.dirname),
  async headers() {
    return [
      {
        // The 809-frame cinematic library is content-addressed and never
        // changes — cache it for the year across all sequences. (The homepage
        // no longer loads these; the film ships as /video/* below. Kept for
        // any stale cached HTML that still references a frame.)
        source: "/frames/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // The cinematic hero film (desktop + mobile MP4s and the poster) is
        // content-addressed per release — cache aggressively.
        source: "/video/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/artwork/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
