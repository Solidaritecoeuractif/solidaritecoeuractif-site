"use client";

import { useMemo, useState } from "react";
import type { TicketingEvent, TicketingRate } from "@/lib/ticketing/types";

type ParticipantDraft = {
  firstName: string;
  lastName: string;
};

type PayerDraft = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type PreparedSummary = {
  reference: string;
  event: {
    id: string;
    slug: string;
    title: string;
  };
  payer: PayerDraft;
  lines: Array<{
    rateId: string;
    rateName: string;
    rateType: string;
    quantity: number;
    unitAmount: number;
    lineTotal: number;
  }>;
  participants: Array<{
    rateId: string;
    firstName: string;
    lastName: string;
  }>;
  subtotalAmount: number;
  extraDonationAmount: number;
  totalAmount: number;
  currency: string;
  message: string;
};

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

  const [payer, setPayer] = useState<PayerDraft>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  const [participants, setParticipants] = useState<
    Record<string, ParticipantDraft>
  >({});

  const [preparing, setPreparing] = useState(false);
  const [prepareMessage, setPrepareMessage] = useState("");
  const [preparedSummary, setPreparedSummary] =
    useState<PreparedSummary | null>(null);

  function updatePayer(patch: Partial<PayerDraft>) {
    setPayer((current) => ({ ...current, ...patch }));
    setPreparedSummary(null);
    setPrepareMessage("");
  }

  function updateParticipant(key: string, patch: Partial<ParticipantDraft>) {
    setParticipants((current) => ({
      ...current,
      [key]: {
        firstName: current[key]?.firstName || "",
        lastName: current[key]?.lastName || "",
        ...patch,
      },
    }));
    setPreparedSummary(null);
    setPrepareMessage("");
  }

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

    setPreparedSummary(null);
    setPrepareMessage("");
  }

  function updateFreeAmount(rate: TicketingRate, value: string) {
    setFreeAmounts((current) => ({
      ...current,
      [rate.id]: value,
    }));

    setPreparedSummary(null);
    setPrepareMessage("");
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

  const participantRows = useMemo(() => {
    return selectedLines.flatMap((line) =>
      Array.from({ length: line.quantity }).map((_, index) => ({
        key: `${line.rate.id}-${index}`,
        rateId: line.rate.id,
        rateName: line.rate.name,
        number: index + 1,
      }))
    );
  }, [selectedLines]);

  const ticketsTotal = selectedLines.reduce(
    (sum, line) => sum + line.lineTotal,
    0
  );

  const extraDonationAmount = event.allowExtraDonation
    ? centsFromEuroInput(extraDonation)
    : 0;

  const totalAmount = ticketsTotal + extraDonationAmount;
  const hasSelection = selectedLines.length > 0;

  const payerComplete =
    payer.firstName.trim() &&
    payer.lastName.trim() &&
    payer.email.trim() &&
    payer.phone.trim();

  const participantsComplete =
    participantRows.length > 0 &&
    participantRows.every((row) => {
      const participant = participants[row.key];
      return participant?.firstName?.trim() && participant?.lastName?.trim();
    });

  const formLooksReady = Boolean(
    hasSelection && payerComplete && participantsComplete
  );

  async function prepareRegistration() {
    if (!formLooksReady || preparing) return;

    setPreparing(true);
    setPrepareMessage("");
    setPreparedSummary(null);

    try {
      const response = await fetch("/api/ticketing/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: event.slug,
          payer,
          lines: selectedLines.map((line) => ({
            rateId: line.rate.id,
            quantity: line.quantity,
            unitAmount: line.unitAmount,
          })),
          participants: participantRows.map((row) => ({
            rateId: row.rateId,
            firstName: participants[row.key]?.firstName || "",
            lastName: participants[row.key]?.lastName || "",
          })),
          extraDonationAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPrepareMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de valider cette inscription."
        );
        return;
      }

      setPreparedSummary(data);
      setPrepareMessage(
        "Validation serveur réussie. Aucun paiement n’a été lancé."
      );
    } catch {
      setPrepareMessage("Erreur pendant la validation de l’inscription.");
    } finally {
      setPreparing(false);
    }
  }

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
                        onChange={(inputEvent) =>
                          updateFreeAmount(rate, inputEvent.target.value)
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
                      onChange={(inputEvent) =>
                        updateQuantity(rate, Number(inputEvent.target.value))
                      }
                    >
                      {Array.from({ length: maxQuantity + 1 }).map(
                        (_, index) => (
                          <option key={index} value={index}>
                            {index}
                          </option>
                        )
                      )}
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

      {hasSelection ? (
        <section
          style={{
            marginTop: "18px",
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Informations du payeur</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontWeight: 700 }}>Prénom</span>
              <input
                className="input"
                value={payer.firstName}
                onChange={(inputEvent) =>
                  updatePayer({ firstName: inputEvent.target.value })
                }
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontWeight: 700 }}>Nom</span>
              <input
                className="input"
                value={payer.lastName}
                onChange={(inputEvent) =>
                  updatePayer({ lastName: inputEvent.target.value })
                }
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontWeight: 700 }}>Email</span>
              <input
                className="input"
                type="email"
                value={payer.email}
                onChange={(inputEvent) =>
                  updatePayer({ email: inputEvent.target.value })
                }
              />
            </label>

            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontWeight: 700 }}>Téléphone</span>
              <input
                className="input"
                value={payer.phone}
                onChange={(inputEvent) =>
                  updatePayer({ phone: inputEvent.target.value })
                }
              />
            </label>
          </div>
        </section>
      ) : null}

      {participantRows.length > 0 ? (
        <section
          style={{
            marginTop: "18px",
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Participants</h3>

          <p style={{ color: "#64748b", lineHeight: 1.6 }}>
            Renseigne le prénom et le nom de chaque participant. Pour l’instant,
            ces informations sont seulement validées par le serveur et aucune
            inscription définitive n’est créée.
          </p>

          <div style={{ display: "grid", gap: "12px" }}>
            {participantRows.map((row, index) => (
              <div
                key={row.key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "14px",
                  background: "#f8fafc",
                  display: "grid",
                  gap: "12px",
                }}
              >
                <strong>
                  Participant {index + 1} — {row.rateName}
                </strong>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Prénom</span>
                    <input
                      className="input"
                      value={participants[row.key]?.firstName || ""}
                      onChange={(inputEvent) =>
                        updateParticipant(row.key, {
                          firstName: inputEvent.target.value,
                        })
                      }
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Nom</span>
                    <input
                      className="input"
                      value={participants[row.key]?.lastName || ""}
                      onChange={(inputEvent) =>
                        updateParticipant(row.key, {
                          lastName: inputEvent.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

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
                onClick={() => {
                  setExtraDonation(String(amount / 100));
                  setPreparedSummary(null);
                  setPrepareMessage("");
                }}
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
              onChange={(inputEvent) => {
                setExtraDonation(inputEvent.target.value);
                setPreparedSummary(null);
                setPrepareMessage("");
              }}
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
          <span>Total estimé</span>
          <span>{formatAmount(totalAmount)}</span>
        </div>

        <button
          type="button"
          className="button"
          disabled={!formLooksReady || preparing}
          onClick={prepareRegistration}
          style={{
            marginTop: "8px",
            opacity: !formLooksReady || preparing ? 0.65 : 1,
            cursor: !formLooksReady || preparing ? "not-allowed" : "pointer",
          }}
        >
          {preparing
            ? "Validation en cours..."
            : formLooksReady
              ? "Valider le récapitulatif"
              : "Compléter les informations"}
        </button>

        <p style={{ color: "#92400e", margin: 0, fontWeight: 700 }}>
          Cette étape valide les données côté serveur, mais ne lance aucun
          paiement et ne crée encore aucune inscription.
        </p>

        {prepareMessage ? (
          <div
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "14px",
              padding: "12px",
              background: "#f8fafc",
              color:
                prepareMessage.includes("Impossible") ||
                prepareMessage.includes("Erreur") ||
                prepareMessage.includes("obligatoire") ||
                prepareMessage.includes("invalide")
                  ? "#991b1b"
                  : "#166534",
              fontWeight: 700,
            }}
          >
            {prepareMessage}
          </div>
        ) : null}
      </div>

      {preparedSummary ? (
        <section
          style={{
            marginTop: "18px",
            border: "1px solid #bbf7d0",
            borderRadius: "18px",
            padding: "18px",
            background: "#f0fdf4",
            display: "grid",
            gap: "12px",
          }}
        >
          <h3 style={{ margin: 0 }}>Récapitulatif validé par le serveur</h3>

          <div>
            <strong>Référence provisoire :</strong>{" "}
            {preparedSummary.reference}
          </div>

          <div>
            <strong>Événement :</strong> {preparedSummary.event.title}
          </div>

          <div>
            <strong>Payeur :</strong> {preparedSummary.payer.firstName}{" "}
            {preparedSummary.payer.lastName} — {preparedSummary.payer.email}
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <strong>Billets validés :</strong>

            {preparedSummary.lines.map((line) => (
              <div
                key={line.rateId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  {line.rateName} × {line.quantity}
                </span>
                <strong>{formatAmount(line.lineTotal)}</strong>
              </div>
            ))}
          </div>

          <div>
            <strong>Participants :</strong>{" "}
            {preparedSummary.participants.length}
          </div>

          {preparedSummary.extraDonationAmount > 0 ? (
            <div>
              <strong>Contribution libre :</strong>{" "}
              {formatAmount(preparedSummary.extraDonationAmount)}
            </div>
          ) : null}

          <div
            style={{
              borderTop: "1px solid #bbf7d0",
              paddingTop: "12px",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            Total validé : {formatAmount(preparedSummary.totalAmount)}
          </div>

          <button
            type="button"
            className="button"
            disabled
            style={{ opacity: 0.65, cursor: "not-allowed" }}
          >
            Paiement Stripe bientôt disponible
          </button>

          <p style={{ margin: 0, color: "#166534", fontWeight: 700 }}>
            Validation réussie : aucune inscription n’a encore été enregistrée.
          </p>
        </section>
      ) : null}
    </section>
  );
}