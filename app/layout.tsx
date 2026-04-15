import type { Metadata } from "next";
import "./globals.css";
import { BrandHeader } from "@/components/BrandHeader";
import { Footer } from "@/components/Footer";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Solidarité Cœur Actif";
const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.solidaritecoeuractif.com";
const siteUrl = new URL(baseUrl);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${brand} | Association solidaire et actions de soutien`,
    template: `%s | ${brand}`,
  },
  description:
    "Solidarité Cœur Actif : actions de soutien, collectes solidaires et participation au service des personnes en situation de précarité.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: brand,
    url: siteUrl,
    title: `${brand} | Association solidaire et actions de soutien`,
    description:
      "Solidarité Cœur Actif : actions de soutien, collectes solidaires et participation au service des personnes en situation de précarité.",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand} | Association solidaire et actions de soutien`,
    description:
      "Solidarité Cœur Actif : actions de soutien, collectes solidaires et participation au service des personnes en situation de précarité.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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