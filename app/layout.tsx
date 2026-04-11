
import type { Metadata } from "next";
import "./globals.css";
import { BrandHeader } from "@/components/BrandHeader";
import { Footer } from "@/components/Footer";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Solidarité Cœur Actif";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"),
  title: {
    default: `${brand} | Boutique, dons et collectes`,
    template: `%s | ${brand}`
  },
  description: "Plateforme premium pour produits, commandes, dons, collectes et paiement sécurisé.",
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <BrandHeader />
        {children}
        <Footer />
      </body>
    </html>
  );
}
