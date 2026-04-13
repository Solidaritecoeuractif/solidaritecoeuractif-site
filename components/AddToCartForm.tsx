"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import {
  calculateZoneAdjustedLineMinimum,
} from "@/lib/destinations";

type CartLine = {
  productId: string;
  quantity: number;
  customAmount?: number;
};

function formatEuroFromCents(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
}

export function AddToCartForm({ product }: { product: Product }) {
  const minimumUnitAmount = product.minimumAmount || 0;
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");

  const franceMinimum = useMemo(
    () => calculateZoneAdjustedLineMinimum(minimumUnitAmount, quantity, "FR"),
    [minimumUnitAmount, quantity]
  );

  const overseasMinimum = useMemo(
    () => calculateZoneAdjustedLineMinimum(minimumUnitAmount, quantity, "FR-GP"),
    [minimumUnitAmount, quantity]
  );

  const internationalMinimum = useMemo(
    () => calculateZoneAdjustedLineMinimum(minimumUnitAmount, quantity, "BE"),
    [minimumUnitAmount, quantity]
  );

  function addToCart() {
    const sanitizedQuantity = Math.max(
      1,
      Math.min(quantity || 1, product.maxQuantity || 50)
    );

    const raw = localStorage.getItem("sca_cart");
    const current: CartLine[] = raw ? JSON.parse(raw) : [];

    const index = current.findIndex(
      (line) => line.productId === product.id && !line.customAmount
    );

    if (index >= 0) {
      current[index] = {
        ...current[index],
        quantity: Math.min(
          (current[index].quantity || 0) + sanitizedQuantity,
          product.maxQuantity || 50
        ),
      };
    } else {
      current.push({
        productId: product.id,
        quantity: sanitizedQuantity,
        customAmount: product.pricingMode === "flexible" ? minimumUnitAmount : undefined,
      });
    }

    localStorage.setItem("sca_cart", JSON.stringify(current));
    window.dispatchEvent(new Event("sca-cart-updated"));
    setMessage("Panier mis à jour.");
  }

  return (
    <div className="panel">
      <div className="form-grid compact">
        <label>
          <span>Quantité</span>
          <input
            type="number"
            min={1}
            max={product.maxQuantity || 50}
            value={quantity}
            onChange={(e) =>
              setQuantity(
                Math.max(
                  1,
                  Math.min(
                    Number(e.target.value || 1),
                    product.maxQuantity || 50
                  )
                )
              )
            }
          />
        </label>
      </div>

      {product.pricingMode === "flexible" ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>Frais de livraison</p>
          <small style={{ display: "block", marginBottom: 6 }}>
            France métropolitaine : <strong>À partir de {formatEuroFromCents(franceMinimum)}</strong>
          </small>
          <small style={{ display: "block", marginBottom: 6 }}>
            Outre-mer : <strong>À partir de {formatEuroFromCents(overseasMinimum)}</strong>
          </small>
          <small style={{ display: "block" }}>
            Hors France : <strong>À partir de {formatEuroFromCents(internationalMinimum)}</strong>
          </small>
        </div>
      ) : null}

      <button className="button primary" onClick={addToCart} type="button">
        Ajouter au panier
      </button>

      {message ? (
        <div className="success-note" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>{message}</p>
          <p style={{ margin: "8px 0 0" }}>
            <Link href="/panier" style={{ fontWeight: 700 }}>
              Panier
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}