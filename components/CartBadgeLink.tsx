"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type CartItem = {
  productId: string;
  quantity: number;
  customAmount?: number;
};

function readCartCount() {
  if (typeof window === "undefined") return 0;

  try {
    const raw = localStorage.getItem("sca_cart");
    const items: CartItem[] = raw ? JSON.parse(raw) : [];
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  } catch {
    return 0;
  }
}

export default function CartBadgeLink() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      setCount(readCartCount());
    };

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("sca-cart-updated", sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("sca-cart-updated", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    setCount(readCartCount());
  }, [pathname]);

  const hasItems = count > 0;

  return (
    <Link
      href="/panier"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        borderRadius: "9999px",
        padding: "6px 12px",
        transition: "all 0.2s ease",
        border: hasItems ? "2px solid #f59e0b" : "2px solid transparent",
        background: hasItems ? "#fffbeb" : "transparent",
        color: hasItems ? "#92400e" : "inherit",
        fontWeight: hasItems ? 700 : 400,
        boxShadow: hasItems ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
      }}
      className={hasItems ? "cart-link-pop" : ""}
    >
      <span>Panier</span>

      {hasItems ? (
        <span
          style={{
            display: "inline-flex",
            minWidth: "24px",
            height: "24px",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "9999px",
            background: "#0f172a",
            color: "white",
            fontSize: "12px",
            fontWeight: 700,
            padding: "0 8px",
          }}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}