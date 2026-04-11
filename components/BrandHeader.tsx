"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CartBadgeLink from "@/components/CartBadgeLink";

function navLinkClass(active: boolean) {
  return active ? "nav-link nav-link-active" : "nav-link";
}

export function BrandHeader() {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Solidarité Cœur Actif";
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-badge">SCA</span>
          <span>
            <strong>{brand}</strong>
            <small>Boutique, soutien et collecte</small>
          </span>
        </Link>

        <nav className="main-nav">
          <Link href="/" className={navLinkClass(pathname === "/")}>
            Accueil
          </Link>

          <CartBadgeLink />

          <Link
            href="/contact"
            className={navLinkClass(pathname === "/contact")}
          >
            Contact
          </Link>

          <Link
            href="/admin-login"
            className={navLinkClass(
              pathname === "/admin-login" || pathname.startsWith("/admin")
            )}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}