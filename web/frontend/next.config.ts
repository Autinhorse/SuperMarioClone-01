import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @napi-rs/canvas ships per-platform native bindings that it loads
  // at runtime via a dynamic `require(\`@napi-rs/canvas-${platform}-...\`)`.
  // Next.js's default behavior is to bundle node_modules code into the
  // server bundle, which breaks that lookup pattern (and gives a
  // misleading "Cannot find native binding" / npm-optional-deps error).
  // Listing the package here keeps it external — Node resolves it at
  // runtime the same way `tsx` does for the backfill script.
  serverExternalPackages: ["@napi-rs/canvas"],

  // Dev-only. `next dev` binds to :: (IPv6) on Windows, so browsing via
  // http://127.0.0.1:3000 looks like a cross-origin request to Next and it
  // blocks /_next/* dev resources — which silently breaks client-side
  // hydration. The symptom is nasty to trace: the page renders (it's
  // server-rendered) but nothing interactive works. In Ricochet's case the
  // host page's postMessage listener never attaches, so the game iframe waits
  // for level data that never arrives and reports "Timed out waiting for level
  // data from host page."
  //
  // Has no effect on production builds.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
