import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load undici from node_modules at runtime instead of bundling it (scanner uses its custom TLS agents).
  serverExternalPackages: ["undici"],
};

export default nextConfig;
