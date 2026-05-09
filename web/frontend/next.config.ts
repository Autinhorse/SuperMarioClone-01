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
};

export default nextConfig;
