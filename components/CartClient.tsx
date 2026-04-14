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

        return {
          ...item,
          product,
        };
      })
      .filter(Boolean) as Array<ClientItem & { product: Product }>;
  }, [items, products]);

  function updateQuantity(index: number, quantity: number) {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(quantity || 1, resolved[idx]?.product.maxQuantity || 50)
              ),
            }
          : item
      )
    );
  }

  function remove(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  const hasFlexibleItem = resolved.some(
    (item) => item.product.pricingMode === "flexible"
  );

  const fixedSubtotal = resolved.reduce((sum, item) => {
    if (item.product.pricingMode !== "fixed") return sum;
    return sum + (item.product.fixedPrice || 0) * item.quantity;
  }, 0);

  return (
    <div className="cart-layout">
      <div className="panel list-panel">
        <h1>Panier</h1>

        {resolved.length === 0 ? (
          <div className="cart-empty-state">
            <p>Votre panier est vide.</p>
            <Link href="/" className="button secondary small">
              Découvrir les actions et soutiens
            </Link>
          </div>
        ) : null}

        {resolved.map((item, index) => (
          <div key={`${item.productId}-${index}`} className="cart-line">
            <div className="cart-line-content">
              <strong>{item.product.title}</strong>

              {item.product.subtitle ? (
                <p>{item.product.subtitle}</p>
              ) : null}

              {item.product.pricingMode === "flexible" ? (
                <small>
                  Frais de livraison calculés à l’étape suivante selon la
                  destination, la quantité et le minimum applicable.
                </small>
              ) : (
                <small>{euros(item.product.fixedPrice || 0)} / unité</small>
              )}
            </div>

            <div className="cart-actions-inline">
              <label className="cart-qty-control">
                <span>Quantité</span>
                <input
                  type="number"
                  min={1}
                  max={item.product.maxQuantity || 50}
                  value={item.quantity}
                  onChange={(e) =>
                    updateQuantity(index, Number(e.target.value || 1))
                  }
                />
              </label>

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

        {resolved.length > 0 && fixedSubtotal > 0 ? (
          <div className="summary-row">
            <span>Sous-total des montants fixes</span>
            <strong>{euros(fixedSubtotal)}</strong>
          </div>
        ) : null}

        {hasFlexibleItem ? (
          <div className="cart-summary-note">
            <p>
              Le montant définitif sera calculé à l’étape suivante selon la
              destination choisie, la quantité et les règles applicables à la
              France métropolitaine, à l’Outre-mer ou à l’international.
            </p>
            <p>
              La participation libre à l’association sera également proposée à
              l’étape suivante.
            </p>
          </div>
        ) : (
          <div className="cart-summary-note">
            <p>
              Vous pouvez continuer pour renseigner la destination et finaliser
              votre demande.
            </p>
          </div>
        )}

        <Link
          href={resolved.length === 0 ? "#" : "/commande"}
          className={`button primary full ${resolved.length === 0 ? "disabled" : ""}`}
          aria-disabled={resolved.length === 0}
          onClick={(e) => {
            if (resolved.length === 0) {
              e.preventDefault();
            }
          }}
        >
          Continuer
        </Link>
      </div>
    </div>
  );
}