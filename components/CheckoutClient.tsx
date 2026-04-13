"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { euros } from "@/lib/utils";
import {
  DESTINATION_OPTIONS,
  FORCED_POSTAL_CODES,
  calculateZoneAdjustedLineMinimum,
} from "@/lib/destinations";

type ClientItem = {
  productId: string;
  quantity: number;
  customAmount?: number;
};

type Quote = {
  subtotalAmount: number;
  shippingAmount: number;
  supportAmount: number;
  totalAmount: number;
};

function lineAmountToUnitAmount(lineAmount: number, quantity: number) {
  return Math.ceil(lineAmount / Math.max(1, quantity));
}

function parseEuroInput(value: string) {
  const numeric = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 100);
}

export function CheckoutClient({ products }: { products: Product[] }) {
  const [items, setItems] = useState<ClientItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [supportEnabled, setSupportEnabled] = useState(true);
  const [supportAmount, setSupportAmount] = useState(0);
  const [touchedShippingInputs, setTouchedShippingInputs] = useState<number[]>(
    []
  );
  const [shippingInputs, setShippingInputs] = useState<Record<number, string>>(
    {}
  );
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "FR",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    notes: "",
  });

  const forcedPostalCode = FORCED_POSTAL_CODES[form.country] || "";
  const isPostalCodeForced = Boolean(forcedPostalCode);

  useEffect(() => {
    setForm((prev) => {
      if (forcedPostalCode) {
        if (prev.postalCode === forcedPostalCode) return prev;
        return { ...prev, postalCode: forcedPostalCode };
      }

      if (prev.postalCode === "00000") {
        return { ...prev, postalCode: "" };
      }

      return prev;
    });
  }, [forcedPostalCode]);

  useEffect(() => {
    const raw = localStorage.getItem("sca_cart");
    setItems(raw ? JSON.parse(raw) : []);
  }, []);

  const resolvedPreview = useMemo(() => {
    return items
      .map((item, index) => {
        const product = products.find(
          (entry) => entry.id === item.productId && entry.isActive
        );
        if (!product) return null;

        const baseMinimum = product.minimumAmount || 0;
        const minimumLineAmount =
          product.pricingMode === "flexible"
            ? calculateZoneAdjustedLineMinimum(
                baseMinimum,
                item.quantity,
                form.country
              )
            : 0;

        const minimumUnitAmount = lineAmountToUnitAmount(
          minimumLineAmount,
          item.quantity
        );

        const hasCustomAmount =
          typeof item.customAmount === "number" && item.customAmount > 0;

        const unit =
          product.pricingMode === "fixed"
            ? product.fixedPrice || 0
            : hasCustomAmount
              ? Math.max(item.customAmount || 0, minimumUnitAmount)
              : 0;

        return {
          ...item,
          index,
          product,
          unit,
          total: unit * item.quantity,
          minimumLineAmount,
          minimumUnitAmount,
          isFlexibleReady:
            product.pricingMode === "fixed" ? true : hasCustomAmount,
        };
      })
      .filter(Boolean) as Array<
      ClientItem & {
        index: number;
        product: Product;
        unit: number;
        total: number;
        minimumLineAmount: number;
        minimumUnitAmount: number;
        isFlexibleReady: boolean;
      }
    >;
  }, [items, products, form.country]);

  const requiresShipping = resolvedPreview.some(
    (item) => item.product.requiresShipping && item.product.isPhysical
  );

  const flexibleItems = resolvedPreview.filter(
    (item) => item.product.pricingMode === "flexible"
  );

  const allFlexibleAmountsEntered = flexibleItems.every(
    (item) =>
      typeof item.customAmount === "number" &&
      item.customAmount > 0 &&
      String(shippingInputs[item.index] ?? "").trim() !== ""
  );

  const localSubtotal = useMemo(
    () => resolvedPreview.reduce((sum, item) => sum + item.total, 0),
    [resolvedPreview]
  );

  const suggestedSupport = useMemo(
    () => Math.round(localSubtotal * 0.2),
    [localSubtotal]
  );

  useEffect(() => {
    setSupportAmount(suggestedSupport);
  }, [suggestedSupport]);

  useEffect(() => {
    async function refreshQuote() {
      if (!items.length || !allFlexibleAmountsEntered) {
        setQuote(null);
        return;
      }

      setQuoting(true);
      setError("");

      try {
        const response = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            country: requiresShipping ? form.country : undefined,
            supportEnabled,
            supportAmount: supportEnabled ? supportAmount : 0,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setQuote(data);
        } else {
          setError(
            typeof data.error === "string" ? data.error : "Erreur de calcul."
          );
        }
      } finally {
        setQuoting(false);
      }
    }

    refreshQuote();
  }, [
    items,
    form.country,
    requiresShipping,
    supportEnabled,
    supportAmount,
    allFlexibleAmountsEntered,
  ]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!allFlexibleAmountsEntered) {
      setError("Merci de renseigner les frais de livraison avant de continuer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          supportEnabled,
          supportAmount: supportEnabled ? supportAmount : 0,
          customer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
          },
          shippingAddress: requiresShipping
            ? {
                country: form.country,
                address1: form.address1,
                address2: form.address2,
                postalCode: form.postalCode,
                city: form.city,
                notes: form.notes,
              }
            : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Erreur lors de la validation."
        );
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateFlexibleLineAmount(index: number, amountInEuros: string) {
    setShippingInputs((prev) => ({ ...prev, [index]: amountInEuros }));

    const parsed = parseEuroInput(amountInEuros);
    if (parsed === null || parsed <= 0) {
      setItems((prev) =>
        prev.map((item, idx) =>
          idx === index ? { ...item, customAmount: undefined } : item
        )
      );
      return;
    }

    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;

        const product = products.find(
          (entry) => entry.id === item.productId && entry.isActive
        );
        if (!product || product.pricingMode !== "flexible") return item;

        const minimumLineAmount = calculateZoneAdjustedLineMinimum(
          product.minimumAmount || 0,
          item.quantity,
          form.country
        );

        const finalLineAmount = Math.max(parsed, minimumLineAmount);
        const finalUnitAmount = lineAmountToUnitAmount(
          finalLineAmount,
          item.quantity
        );

        return {
          ...item,
          customAmount: finalUnitAmount,
        };
      })
    );
  }

  function handleShippingBlur(index: number) {
    setTouchedShippingInputs((prev) =>
      prev.includes(index) ? prev : [...prev, index]
    );

    const value = shippingInputs[index];
    const parsed = parseEuroInput(value);

    if (parsed === null || parsed <= 0) {
      return;
    }

    const item = resolvedPreview.find((entry) => entry.index === index);
    if (!item) return;

    const finalLineAmount = Math.max(parsed, item.minimumLineAmount);

    setItems((prev) =>
      prev.map((entry, idx) =>
        idx === index
          ? {
              ...entry,
              customAmount: lineAmountToUnitAmount(
                finalLineAmount,
                entry.quantity
              ),
            }
          : entry
      )
    );

    setShippingInputs((prev) => ({
      ...prev,
      [index]: (finalLineAmount / 100).toFixed(2).replace(".", ","),
    }));
  }

  function displayShippingInput(itemIndex: number) {
    return shippingInputs[itemIndex] ?? "";
  }

  return (
    <div className="checkout-layout">
      <form onSubmit={submit} className="panel">
        <h1>Finaliser votre demande</h1>

        <div className="form-grid">
          <label>
            <span>Prénom</span>
            <input
              required
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </label>

          <label>
            <span>Nom</span>
            <input
              required
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </label>

          <label>
            <span>Téléphone</span>
            <input
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </label>
        </div>

        <h2>Destination</h2>

        <div className="form-grid">
          <label>
            <span>Pays / destination</span>
            <select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            >
              {DESTINATION_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {requiresShipping ? (
          <>
            <h2>Adresse de livraison</h2>

            <div className="form-grid">
              <label>
                <span>Adresse</span>
                <input
                  required
                  value={form.address1}
                  onChange={(e) => update("address1", e.target.value)}
                />
              </label>

              <label>
                <span>Complément</span>
                <input
                  value={form.address2}
                  onChange={(e) => update("address2", e.target.value)}
                />
              </label>

              <label>
                <span>Code postal</span>
                <input
                  required
                  value={form.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                  readOnly={isPostalCodeForced}
                  style={
                    isPostalCodeForced
                      ? {
                          background: "#f1f5f9",
                          color: "#64748b",
                          cursor: "not-allowed",
                        }
                      : undefined
                  }
                />
                {isPostalCodeForced ? (
                  <p
                    style={{
                      marginTop: "8px",
                      fontSize: "14px",
                      color: "#64748b",
                    }}
                  >
                    Code postal rempli automatiquement pour ce pays :{" "}
                    {forcedPostalCode}
                  </p>
                ) : null}
              </label>

              <label>
                <span>Ville / commune</span>
                <input
                  required
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </label>

              <label className="full">
                <span>Informations complémentaires pour la livraison</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                />
              </label>
            </div>
          </>
        ) : null}

        {error ? <p className="error-note">{error}</p> : null}
      </form>

      <div className="panel summary-panel">
        <h2>Votre récapitulatif</h2>

        {resolvedPreview.map((item) => (
          <div key={item.index} style={{ marginBottom: 16 }}>
            <div className="summary-row">
              <span>
                {item.product.title} x{item.quantity}
              </span>
              <strong>
                {item.product.pricingMode === "flexible"
                  ? item.isFlexibleReady
                    ? `Frais de livraison ${euros(item.total)}`
                    : "Frais de livraison à renseigner"
                  : euros(item.total)}
              </strong>
            </div>

            {item.product.pricingMode === "flexible" ? (
              <div style={{ marginTop: 8 }}>
                <label style={{ display: "block" }}>
                  <span
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontWeight: 600,
                    }}
                  >
                    Frais de livraison
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={displayShippingInput(item.index)}
                    onChange={(e) =>
                      updateFlexibleLineAmount(item.index, e.target.value)
                    }
                    onBlur={() => handleShippingBlur(item.index)}
                    placeholder=""
                  />
                  <small style={{ display: "block", marginTop: 8 }}>
                    Minimum autorisé pour cette destination :{" "}
                    <strong>{euros(item.minimumLineAmount)}</strong>
                  </small>
                </label>
              </div>
            ) : null}
          </div>
        ))}

        <div className="summary-row" style={{ marginTop: 16 }}>
          <span>Sous-total</span>
          <strong>
            {allFlexibleAmountsEntered
              ? euros(quote?.subtotalAmount || 0)
              : "—"}
          </strong>
        </div>

        <div className="summary-row">
          <span>Livraison</span>
          <strong>
            {allFlexibleAmountsEntered
              ? quoting
                ? "Calcul..."
                : euros(quote?.shippingAmount || 0)
              : "—"}
          </strong>
        </div>

        {resolvedPreview.length > 0 ? (
          <div
            style={{
              marginTop: 16,
              marginBottom: 16,
              padding: 16,
              border: "1px solid #e2e8f0",
              borderRadius: 16,
              background: "#f8fafc",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 10,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={supportEnabled}
                onChange={(e) => setSupportEnabled(e.target.checked)}
                style={{ marginTop: 4 }}
              />
              <span>
                <strong>Participation libre à l’Association</strong>
                <br />
                <small>
                  Cette participation complémentaire aide l’association à
                  poursuivre ses actions solidaires.
                </small>
              </span>
            </label>

            {supportEnabled ? (
              <label style={{ display: "block" }}>
                <span
                  style={{
                    display: "block",
                    marginBottom: 6,
                    fontWeight: 600,
                  }}
                >
                  Montant de la participation libre
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={(supportAmount / 100).toFixed(2)}
                  onChange={(e) =>
                    setSupportAmount(
                      Math.max(0, Math.round(Number(e.target.value || 0) * 100))
                    )
                  }
                />
                <small style={{ display: "block", marginTop: 8 }}>
                  Suggestion actuelle : <strong>{euros(suggestedSupport)}</strong>
                </small>
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="summary-row total">
          <span>Total</span>
          <strong>
            {allFlexibleAmountsEntered
              ? euros(quote?.totalAmount || 0)
              : "—"}
          </strong>
        </div>

        <div style={{ marginTop: 16 }}>
          <button
            className="button primary"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              const formElement = document.querySelector("form");
              if (formElement) {
                formElement.requestSubmit();
              }
            }}
            disabled={
              loading ||
              resolvedPreview.length === 0 ||
              !allFlexibleAmountsEntered
            }
          >
            {loading
              ? "Redirection..."
              : "Continuer vers le paiement sécurisé"}
          </button>
        </div>

        <p>
          Les montants tiennent compte de la destination choisie : France
          métropolitaine, Outre-mer ou international.
        </p>
      </div>
    </div>
  );
}