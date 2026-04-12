"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { euros } from "@/lib/utils";

type ClientItem = {
  productId: string;
  quantity: number;
  customAmount?: number;
};

export function CartClient({ products }: { products: Product[] }) {
  const [items, setItems] = useState<ClientItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("sca_cart");
    setItems(raw ? JSON.parse(raw) : []);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("sca_cart", JSON.stringify(items));
    window.dispatchEvent(new Event("sca-cart-updated"));
  }, [items, isHydrated]);

  const resolved = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find(
          (entry) => entry.id === item.productId && entry.isActive
        );
        if (!product) return null;

        const minimum = product.minimumAmount || 0;
        const unit =
          product.pricingMode === "fixed"
            ? product.fixedPrice || 0
            : Math.max(item.customAmount || 0, minimum);

        return {
          ...item,
          product,
          unit,
          total: unit * item.quantity,
        };
      })
      .filter(Boolean) as Array<
      ClientItem & { product: Product; unit: number; total: number }
    >;
  }, [items, products]);

  const subtotal = resolved.reduce((sum, item) => sum + item.total, 0);

  function updateQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  return (
    <div className="cart-layout">
      <div className="panel list-panel">
        <h1>Panier</h1>

        {resolved.length === 0 ? <p>Votre panier est vide.</p> : null}

        {resolved.map((item, index) => (
          <div key={`${item.productId}-${index}`} className="cart-line">
            <div>
              <strong>{item.product.title}</strong>
              <p>{item.product.subtitle}</p>
              <small>{euros(item.unit)} / unité</small>
              {item.product.pricingMode === "flexible" ? (
                <small> · participation personnalisée</small>
              ) : null}
            </div>

            <div className="cart-actions-inline">
              <input
                type="number"
                min={1}
                max={item.product.maxQuantity || 50}
                value={item.quantity}
                onChange={(e) =>
                  updateQuantity(index, Number(e.target.value || 1))
                }
              />
              <strong>{euros(item.total)}</strong>
              <button
                type="button"
                className="button ghost small"
                onClick={() => remove(index)}
              >
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel summary-panel">
        <h2>Récapitulatif</h2>
        <div className="summary-row">
          <span>Sous-total</span>
          <strong>{euros(subtotal)}</strong>
        </div>
        <p>
          Les éventuels frais de livraison ou de participation complémentaire
          seront précisés selon la destination et la nature du support concerné.
        </p>
        <Link
          href="/commande"
          className={`button primary full ${resolved.length === 0 ? "disabled" : ""}`}
          aria-disabled={resolved.length === 0}
        >
          Continuer
        </Link>
      </div>
    </div>
  );
}