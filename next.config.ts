import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships WASM and data files; keep it (and pg) out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
