"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { calculateZoneAdjustedLineMinimum } from "@/lib/destinations";
import CartBadgeLink from "@/components/CartBadgeLink";

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
  const [quantityInput, setQuantityInput] = useState("");
  const [message, setMessage] = useState("");

  const quantity = useMemo(() => {
    const numeric = Number(quantityInput);
    if (!Number.isFinite(numeric) || numeric <= 0) return 1;
    return Math.max(
      1,
      Math.min(Math.floor(numeric), product.maxQuantity || 50)
    );
  }, [quantityInput, product.maxQuantity]);

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
    const parsed = Number(quantityInput);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Merci d’indiquer une quantité valide.");
      return;
    }

    const sanitizedQuantity = Math.max(
      1,
      Math.min(Math.floor(parsed), product.maxQuantity || 50)
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
        customAmount:
          product.pricingMode === "flexible" ? minimumUnitAmount : undefined,
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
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            placeholder=""
          />
        </label>
      </div>

      {product.pricingMode === "flexible" ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>Frais de livraison</p>
          <small style={{ display: "block", marginBottom: 6 }}>
            France métropolitaine :{" "}
            <strong>À partir de {formatEuroFromCents(franceMinimum)}</strong>
          </small>
          <small style={{ display: "block", marginBottom: 6 }}>
            Outre-mer :{" "}
            <strong>À partir de {formatEuroFromCents(overseasMinimum)}</strong>
          </small>
          <small style={{ display: "block" }}>
            Hors France :{" "}
            <strong>
              À partir de {formatEuroFromCents(internationalMinimum)}
            </strong>
          </small>
        </div>
      ) : null}

      <button className="button primary" onClick={addToCart} type="button">
        Ajouter au panier
      </button>

      {message ? (
        <div className="success-note" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>{message}</p>

          <div
            style={{
              marginTop: 10,
              display: "inline-block",
              animation: "cartPulse 1.1s ease-in-out infinite",
            }}
          >
            <CartBadgeLink />
          </div>

          <style jsx>{`
            @keyframes cartPulse {
              0% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.08);
              }
              100% {
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      ) : null}
    </div>
  );
}