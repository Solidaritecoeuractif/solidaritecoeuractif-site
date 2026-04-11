"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function adminLinkClass(active: boolean) {
  return active ? "admin-tab admin-tab-active" : "admin-tab";
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      <Link href="/admin" className={adminLinkClass(pathname === "/admin")}>
        Dashboard
      </Link>

      <Link
        href="/admin/orders"
        className={adminLinkClass(pathname.startsWith("/admin/orders"))}
      >
        Commandes
      </Link>

      <Link
        href="/admin/products"
        className={adminLinkClass(pathname.startsWith("/admin/products"))}
      >
        Offres
      </Link>

      <form action="/api/auth/logout" method="post">
        <button className="button secondary" type="submit">
          Déconnexion
        </button>
      </form>
    </nav>
  );
}