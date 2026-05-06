"use client";

import { useMemo, useState } from "react";
import type { TicketingEvent, TicketingRate } from "@/lib/ticketing/types";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
}

function centsFromEuroInput(value: string) {
  const number = Number(String(value || "").replace(",", ".").trim());

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.round(number * 100);
}

function euroInputFromCents(value?: number) {
  if (typeof value !== "number") return "";
  return String(value / 100);
}

function ratePriceLabel(rate: TicketingRate) {
  if (rate.type === "free") return "Gratuit";

  if (rate.type === "free_amount") {
    return `À partir de ${formatAmount(rate.minimumAmount || 0)}`;
  }

  return formatAmount(rate.amount || 0);
}

export default function PublicTicketingSelectionClient({
  event,
  rates,
}: {
  event: TicketingEvent;
  rates: TicketingRate[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [freeAmounts, setFreeAmounts] = useState<Record<string, string>>({});
  const [extraDonation, setExtraDonation] = useState("");

  function updateQuantity(rate: TicketingRate, nextQuantity: number) {
    const safeQuantity = Math.max(0, Math.floor(nextQuantity || 0));
    const limit = rate.quantityPerOrderLimit;

    const finalQuantity =
      typeof limit === "number" && limit > 0
        ? Math.min(safeQuantity, limit)
        : safeQuantity;

    setQuantities((current) => ({
      ...current,
      [rate.id]: finalQuantity,
    }));
  }

  function updateFreeAmount(rate: TicketingRate, value: string) {
    setFreeAmounts((current) => ({
      ...current,
      [rate.id]: value,
    }));
  }

  const selectedLines = useMemo(() => {
    return rates
      .map((rate) => {
        const quantity = quantities[rate.id] || 0;

        let unitAmount = 0;

        if (rate.type === "fixed") {
          unitAmount = rate.amount || 0;
        }

        if (rate.type === "free_amount") {
          const enteredAmount = centsFromEuroInput(freeAmounts[rate.id] || "");
          const minimumAmount = rate.minimumAmount || 0;
          unitAmount = Math.max(enteredAmount, minimumAmount);
        }

        return {
          rate,
          quantity,
          unitAmount,
          lineTotal: unitAmount * quantity,
        };
      })
      .filter((line) => line.quantity > 0);
  }, [rates, quantities, freeAmounts]);

  const ticketsTotal = selectedLines.reduce(
    (sum, line) => sum + line.lineTotal,
    0
  );

  const extraDonationAmount = event.allowExtraDonation
    ? centsFromEuroInput(extraDonation)
    : 0;

  const totalAmount = ticketsTotal + extraDonationAmount;

  const hasSelection = selectedLines.length > 0;

  return (
    <section
      style={{
        border: "1px solid #dbe3ee",
        borderRadius: "22px",
        padding: "24px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          alignItems: "end",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 6px",
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 700,
            }}
          >
            Sélection des billets
          </p>

          <h2 style={{ margin: 0, fontSize: "28px" }}>Choisir un billet</h2>
        </div>

        <span
          style={{
            border: "1px solid #facc15",
            borderRadius: "999px",
            padding: "8px 12px",
            color: "#92400e",
            fontSize: "13px",
            fontWeight: 700,
            background: "#fffbeb",
          }}
        >
          Test sans paiement
        </span>
      </div>

      {rates.length === 0 ? (
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Aucun tarif actif n’est disponible pour le moment.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {rates.map((rate) => {
            const quantity = quantities[rate.id] || 0;
            const maxQuantity = rate.quantityPerOrderLimit || 20;

            return (
              <article
                key={rate.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  padding: "18px",
                  background: "#f8fafc",
                  display: "grid",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "14px",
                    alignItems: "start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px" }}>
                      {rate.name}
                    </h3>

                    {rate.description ? (
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "#475569",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {rate.description}
                      </p>
                    ) : null}
                  </div>

                  <strong style={{ fontSize: "20px", whiteSpace: "nowrap" }}>
                    {ratePriceLabel(rate)}
                  </strong>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      rate.type === "free_amount"
                        ? "minmax(160px, 1fr) minmax(120px, 180px)"
                        : "minmax(120px, 180px)",
                    gap: "12px",
                    alignItems: "end",
                  }}
                >
                  {rate.type === "free_amount" ? (
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>
                        Montant par billet
                      </span>
                      <input
                        className="input"
                        value={
                          freeAmounts[rate.id] ||
                          euroInputFromCents(rate.minimumAmount)
                        }
                        onChange={(event) =>
                          updateFreeAmount(rate, event.target.value)
                        }
                        placeholder="Ex. 50"
                      />
                    </label>
                  ) : null}

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Quantité</span>
                    <select
                      className="input"
                      value={quantity}
                      onChange={(event) =>
                        updateQuantity(rate, Number(event.target.value))
                      }
                    >
                      {Array.from({ length: maxQuantity + 1 }).map((_, index) => (
                        <option key={index} value={index}>
                          {index}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {rate.totalQuantityLimit ? (
                    <span>Places prévues : {rate.totalQuantityLimit}</span>
                  ) : null}

                  {rate.quantityPerOrderLimit ? (
                    <span>
                      Limite par commande : {rate.quantityPerOrderLimit}
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {event.allowExtraDonation ? (
        <div
          style={{
            marginTop: "18px",
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "18px",
            background: "#f8fafc",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Contribution libre</h3>

          <p style={{ color: "#64748b", lineHeight: 1.6 }}>
            Une contribution libre pourra être ajoutée en plus des billets.
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {event.suggestedDonationAmounts.map((amount) => (
              <button
                key={amount}
                type="button"
                className="button secondary"
                onClick={() => setExtraDonation(String(amount / 100))}
              >
                {formatAmount(amount)}
              </button>
            ))}
          </div>

          <label
            style={{
              display: "grid",
              gap: "6px",
              marginTop: "12px",
              maxWidth: "240px",
            }}
          >
            <span style={{ fontWeight: 700 }}>Autre montant</span>
            <input
              className="input"
              value={extraDonation}
              onChange={(event) => setExtraDonation(event.target.value)}
              placeholder="Ex. 10"
            />
          </label>
        </div>
      ) : null}

      <div
        style={{
          marginTop: "20px",
          border: "1px solid #dbe3ee",
          borderRadius: "18px",
          padding: "18px",
          background: "#ffffff",
          display: "grid",
          gap: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>Récapitulatif</h3>

        {selectedLines.length === 0 ? (
          <p style={{ color: "#64748b", margin: 0 }}>
            Aucun billet sélectionné.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {selectedLines.map((line) => (
              <div
                key={line.rate.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {line.rate.name} × {line.quantity}
                </span>
                <strong>{formatAmount(line.lineTotal)}</strong>
              </div>
            ))}

            {extraDonationAmount > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span>Contribution libre</span>
                <strong>{formatAmount(extraDonationAmount)}</strong>
              </div>
            ) : null}
          </div>
        )}

        <div
          style={{
            borderTop: "1px solid #e5e7eb",
            paddingTop: "12px",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            fontSize: "20px",
            fontWeight: 800,
          }}
        >
          <span>Total</span>
          <span>{formatAmount(totalAmount)}</span>
        </div>

        <button
          type="button"
          className="button"
          disabled
          style={{ marginTop: "8px", opacity: 0.65, cursor: "not-allowed" }}
        >
          Paiement bientôt disponible
        </button>

        <p style={{ color: "#92400e", margin: 0, fontWeight: 700 }}>
          Ce formulaire est encore en test : aucune inscription n’est enregistrée
          et aucun paiement n’est lancé.
        </p>
      </div>
    </section>
  );
}