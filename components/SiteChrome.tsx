"use client";

import { usePathname } from "next/navigation";
import { BrandHeader } from "@/components/BrandHeader";
import { Footer } from "@/components/Footer";

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isOrganizerArea = pathname?.startsWith("/organisateur");
  const isAdminArea = pathname?.startsWith("/admin");

  const hidePublicChrome = isOrganizerArea || isAdminArea;

  if (hidePublicChrome) {
    return <>{children}</>;
  }

  return (
    <div className="public-site">
      <a href="#public-content" className="public-skip-link">Aller au contenu</a>
      <BrandHeader />
      <div id="public-content" tabIndex={-1}>{children}</div>
      <Footer />
    </div>
  );
}
