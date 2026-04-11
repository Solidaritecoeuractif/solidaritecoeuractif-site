"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";

type CartLine = { productId: string; quantity: number; customAmount?: number };

export function AddToCartForm({ product }: { product: Product }) {
  const minimumAmount = product.minimumAmount || 0;
  const [quantity, setQuantity] = useState(1);
  const [customAmount, setCustomAmount] = useState(product.suggestedAmount || minimumAmount || 0);
  const [message, setMessage] = useState("");

  const displayMinimum = useMemo(() => (minimumAmount / 100).toFixed(2), [minimumAmount]);

  function addToCart() {
    const sanitizedQuantity = Math.max(1, Math.min(quantity, product.maxQuantity || 50));
    const sanitizedAmount = product.pricingMode === "flexible"
      ? Math.max(customAmount || 0, minimumAmount)
      : undefined;

    const raw = localStorage.getItem("sca_cart");
    const current: CartLine[] = raw ? JSON.parse(raw) : [];
    const index = current.findIndex(
      (line) =>
        line.productId === product.id &&
        (line.customAmount || undefined) === (sanitizedAmount || undefined)
    );

    if (index >= 0) {
      current[index] = {
        ...current[index],
        quantity: Math.min((current[index].quantity || 0) + sanitizedQuantity, product.maxQuantity || 50)
      };
    } else {
      current.push({
        productId: product.id,
        quantity: sanitizedQuantity,
        customAmount: sanitizedAmount
      });
    }

    localStorage.setItem("sca_cart", JSON.stringify(current));
window.dispatchEvent(new Event("sca-cart-updated"));
setMessage("Ajouté au panier.");
  }

  return (
    <div className="panel">
      <div className="form-grid compact">
        <label>
          <span>Quantité</span>
          <input type="number" min={1} max={product.maxQuantity || 50} value={quantity} onChange={(e) => setQuantity(Number(e.target.value || 1))} />
        </label>
        {product.pricingMode === "flexible" ? (
          <label>
            <span>Montant unitaire en €</span>
            <input
              type="number"
              min={Number(displayMinimum)}
              step="0.01"
              value={(customAmount || 0) / 100}
              onChange={(e) => setCustomAmount(Math.round(Number(e.target.value || 0) * 100))}
            />
            <small>Minimum : {displayMinimum} €</small>
          </label>
        ) : null}
      </div>
      <button className="button primary" onClick={addToCart} type="button">Ajouter au panier</button>
      {message ? <p className="success-note">{message}</p> : null}
    </div>
  );
}
