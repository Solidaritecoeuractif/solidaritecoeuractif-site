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
    <>
      <BrandHeader />
      {children}
      <Footer />
    </>
  );
}