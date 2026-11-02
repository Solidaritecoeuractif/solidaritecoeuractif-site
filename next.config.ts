import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/produit/livre-gratuit-365-jours-avec-le-seigneur-jesus-christ",
        destination: "https://quali-m-consult.com/produit/srtq1ssi70290x5",
        permanent: false
      },
      {
        source: "/partenaires/qualim/365",
        destination: "https://quali-m-consult.com/produit/srtq1ssi70290x5",
        permanent: false
      }
    ];
  },
  images: {
    // Temporary containment until Vercel confirms the patched Node.js runtime.
    // Serve original images without server-side fetching/decompression.
    unoptimized: true,
    localPatterns: [],
    remotePatterns: []
  }
};

export default nextConfig;
