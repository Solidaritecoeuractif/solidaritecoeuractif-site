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
  const maxQuantity = product.maxQuantity || 50;

  const [quantityInput, setQuantityInput] = useState("1");
  const [message, setMessage] = useState("");

  function normalizeQuantity(value: number) {
    if (!Number.isFinite(value) || value <= 0) return 1;
    return Math.max(1, Math.min(Math.floor(value), maxQuantity));
  }

  const quantity = useMemo(() => {
    return normalizeQuantity(Number(quantityInput));
  }, [quantityInput, maxQuantity]);

  const franceMinimum = useMemo(
    () => calculateZoneAdjustedLineMinimum(product, quantity, "FR"),
    [product, quantity]
  );

  const overseasMinimum = useMemo(
    () => calculateZoneAdjustedLineMinimum(product, quantity, "FR-GP"),
    [product, quantity]
  );

  const internationalMinimum = useMemo(
    () => calculateZoneAdjustedLineMinimum(product, quantity, "BE"),
    [product, quantity]
  );

  function decreaseQuantity() {
    setMessage("");
    setQuantityInput((prev) => String(normalizeQuantity(Number(prev) - 1)));
  }

  function increaseQuantity() {
    setMessage("");
    setQuantityInput((prev) => String(normalizeQuantity(Number(prev) + 1)));
  }

  function updateQuantity(value: string) {
    setMessage("");

    if (value === "") {
      setQuantityInput("");
      return;
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return;
    }

    setQuantityInput(String(normalizeQuantity(numeric)));
  }

  function addToCart() {
    const parsed = Number(quantityInput);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Merci d’indiquer une quantité valide.");
      return;
    }

    const sanitizedQuantity = normalizeQuantity(parsed);

    const raw = localStorage.getItem("sca_cart");
    const current: CartLine[] = raw ? JSON.parse(raw) : [];

    const index = current.findIndex(
      (line) =>
        line.productId === product.id &&
        typeof line.customAmount === "undefined"
    );

    if (index >= 0) {
      current[index] = {
        ...current[index],
        quantity: Math.min(
          (current[index].quantity || 0) + sanitizedQuantity,
          maxQuantity
        ),
      };
    } else {
      current.push({
        productId: product.id,
        quantity: sanitizedQuantity,
        customAmount: undefined,
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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              maxWidth: 360,
            }}
          >
            <button
              type="button"
              onClick={decreaseQuantity}
              aria-label="Diminuer la quantité"
              disabled={quantity <= 1}
              style={{
                width: 54,
                height: 54,
                borderRadius: "16px",
                border: "2px solid #d99a2b",
                background: quantity <= 1 ? "#f8fafc" : "#fff7ed",
                color: quantity <= 1 ? "#94a3b8" : "#8a4b12",
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1,
                cursor: quantity <= 1 ? "not-allowed" : "pointer",
                boxShadow:
                  quantity <= 1
                    ? "none"
                    : "0 8px 18px rgba(217, 154, 43, 0.18)",
              }}
            >
              –
            </button>

            <input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  value={quantityInput}
  onChange={(e) => updateQuantity(e.target.value)}
  onBlur={() => setQuantityInput(String(quantity))}
  style={{
    border: "2px solid #cfd8e6",
    borderRadius: "18px",
    padding: "0 12px",
    width: "96px",
    minWidth: "96px",
    height: "54px",
    lineHeight: "54px",
    textAlign: "center",
    fontSize: "1.35rem",
    fontWeight: 900,
    appearance: "textfield",
    WebkitAppearance: "none",
  }}
/>

            <button
              type="button"
              onClick={increaseQuantity}
              aria-label="Augmenter la quantité"
              disabled={quantity >= maxQuantity}
              style={{
                width: 54,
                height: 54,
                borderRadius: "16px",
                border: "2px solid #d99a2b",
                background: quantity >= maxQuantity ? "#f8fafc" : "#fff7ed",
                color: quantity >= maxQuantity ? "#94a3b8" : "#8a4b12",
                fontSize: 30,
                fontWeight: 900,
                lineHeight: 1,
                cursor: quantity >= maxQuantity ? "not-allowed" : "pointer",
                boxShadow:
                  quantity >= maxQuantity
                    ? "none"
                    : "0 8px 18px rgba(217, 154, 43, 0.18)",
              }}
            >
              +
            </button>
          </div>

          <small
            style={{
              display: "block",
              marginTop: 8,
              color: "#64748b",
              fontSize: "0.9rem",
            }}
          >
            Utilisez + ou – pour choisir le nombre d’exemplaires.
          </small>
        </label>
      </div>

      {product.pricingMode === "flexible" ? (
        <div className="shipping-preview-box">
          <p className="shipping-preview-title">
            Repères du montant minimum selon la destination
          </p>

          <small>
            France métropolitaine :{" "}
            <strong>à partir de {formatEuroFromCents(franceMinimum)}</strong>
          </small>

          <small>
            Outre-mer :{" "}
            <strong>à partir de {formatEuroFromCents(overseasMinimum)}</strong>
          </small>

          <small>
            Hors France :{" "}
            <strong>
              à partir de {formatEuroFromCents(internationalMinimum)}
            </strong>
          </small>

          <small style={{ marginTop: 6, color: "#64748b" }}>
            Le montant exact sera automatiquement appliqué dans le panier selon
            l’adresse indiquée.
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