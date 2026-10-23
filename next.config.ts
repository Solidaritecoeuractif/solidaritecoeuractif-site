import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Temporary containment until Vercel confirms the patched Node.js runtime.
    // Serve original images without server-side fetching/decompression.
    unoptimized: true,
    localPatterns: [],
    remotePatterns: []
  }
};

export default nextConfig;
