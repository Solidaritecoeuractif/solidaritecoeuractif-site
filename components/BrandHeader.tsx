"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import CartBadgeLink from "@/components/CartBadgeLink";

function navLinkClass(active: boolean) {
  return active ? "nav-link nav-link-active" : "nav-link";
}

export function BrandHeader() {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Solidarité Cœur Actif";
  const pathname = usePathname();

  const showAdminLink =
    pathname === "/admin-login" || pathname.startsWith("/admin");

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-logo">
            <Image
              src="/logo-association.png"
              alt="Logo Solidarité Cœur Actif"
              width={52}
              height={52}
              priority
            />
          </span>

          <span>
            <strong>{brand}</strong>
            <small>Association solidaire et actions de soutien</small>
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

          {showAdminLink ? (
            <Link
              href="/admin-login"
              className={navLinkClass(
                pathname === "/admin-login" || pathname.startsWith("/admin")
              )}
            >
              Admin
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}