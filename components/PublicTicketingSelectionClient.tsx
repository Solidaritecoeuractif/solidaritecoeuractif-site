"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  TicketingCustomField,
  TicketingEvent,
  TicketingRate,
} from "@/lib/ticketing/types";

type ParticipantDraft = {
  firstName: string;
  lastName: string;
  age: string;
  email: string;
  phone: string;
  originCity: string;
  answers: Record<string, string | boolean>;
};

type PromoState = "idle" | "valid" | "invalid";

type PreparedSummary = {
  reference: string;
  event: {
    id: string;
    slug: string;
    title: string;
  };
  payer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  lines: Array<{
    rateId: string;
    rateName: string;
    rateType: string;
    quantity: number;
    originalUnitAmount: number;
    unitAmount: number;
    discountAmountPerUnit: number;
    originalLineTotal: number;
    lineTotal: number;
    discountTotal: number;
    promoApplied: boolean;
    promoCode: string;
    promoDiscountPercent: number;
  }>;
  participants: Array<{
    rateId: string;
    firstName: string;
    lastName: string;
    age: string;
    email: string;
    phone: string;
    originCity: string;
    answers: Record<string, string | boolean>;
  }>;
  originalSubtotalAmount: number;
  subtotalAmount: number;
  discountAmount: number;
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

function emptyParticipant(): ParticipantDraft {
  return {
    firstName: "",
    lastName: "",
    age: "",
    email: "",
    phone: "",
    originCity: "",
    answers: {},
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function fieldValueIsFilled(field: TicketingCustomField, value: unknown) {
  if (field.type === "checkbox") {
    return value === true;
  }

  return String(value ?? "").trim().length > 0;
}

function normalizePromoCode(value: string) {
  return String(value || "").trim().toUpperCase();
}

function canDisplayPromo(rate: TicketingRate) {
  return Boolean(
    rate.promoCodeEnabled &&
      rate.promoCodePublic &&
      rate.promoCode &&
      rate.promoDiscountPercent &&
      rate.promoDiscountPercent > 0
  );
}

function applyPercentDiscount(amount: number, percent?: number) {
  const safePercent =
    typeof percent === "number"
      ? Math.max(0, Math.min(100, Math.round(percent)))
      : 0;

  if (safePercent <= 0) return amount;

  return Math.max(0, Math.round(amount * (1 - safePercent / 100)));
}

function normalizeContributionPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(10, Math.round(value)));
}

function suggestedContributionAmountFromSubtotal(
  subtotalAmount: number,
  percent?: number
) {
  const safePercent = normalizeContributionPercent(percent);

  if (subtotalAmount <= 0 || safePercent <= 0) return 0;

  return Math.round((subtotalAmount * safePercent) / 100);
}

export default function PublicTicketingSelectionClient({
  event,
  rates,
  customFields,
}: {
  event: TicketingEvent;
  rates: TicketingRate[];
  customFields: TicketingCustomField[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [freeAmounts, setFreeAmounts] = useState<Record<string, string>>({});
  const [extraDonation, setExtraDonation] = useState("");
  const [extraDonationTouched, setExtraDonationTouched] = useState(false);

  const [promoOpen, setPromoOpen] = useState<Record<string, boolean>>({});
  const [promoInputs, setPromoInputs] = useState<Record<string, string>>({});
  const [promoStates, setPromoStates] = useState<Record<string, PromoState>>(
    {}
  );

  const [participants, setParticipants] = useState<
    Record<string, ParticipantDraft>
  >({});

  const [preparing, setPreparing] = useState(false);
  const [prepareMessage, setPrepareMessage] = useState("");
  const [preparedSummary, setPreparedSummary] =
    useState<PreparedSummary | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState("");

  function resetServerState() {
    setPreparedSummary(null);
    setPrepareMessage("");
    setCheckoutMessage("");
  }

  function updateParticipant(key: string, patch: Partial<ParticipantDraft>) {
    setParticipants((current) => ({
      ...current,
      [key]: {
        ...emptyParticipant(),
        ...(current[key] || {}),
        ...patch,
      },
    }));

    resetServerState();
  }

  function updateParticipantAnswer(
    key: string,
    fieldKey: string,
    value: string | boolean
  ) {
    setParticipants((current) => {
      const existing = current[key] || emptyParticipant();

      return {
        ...current,
        [key]: {
          ...existing,
          answers: {
            ...existing.answers,
            [fieldKey]: value,
          },
        },
      };
    });

    resetServerState();
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

    resetServerState();
  }

  function updateFreeAmount(rate: TicketingRate, value: string) {
    setFreeAmounts((current) => ({
      ...current,
      [rate.id]: value,
    }));

    resetServerState();
  }

  function togglePromo(rateId: string) {
    setPromoOpen((current) => ({
      ...current,
      [rateId]: !current[rateId],
    }));
  }

  function updatePromoInput(rateId: string, value: string) {
    setPromoInputs((current) => ({
      ...current,
      [rateId]: value,
    }));

    setPromoStates((current) => ({
      ...current,
      [rateId]: "idle",
    }));

    resetServerState();
  }

  function applyPromoCode(rate: TicketingRate) {
    const enteredCode = normalizePromoCode(promoInputs[rate.id] || "");
    const expectedCode = normalizePromoCode(rate.promoCode || "");

    if (!enteredCode || !expectedCode || enteredCode !== expectedCode) {
      setPromoStates((current) => ({
        ...current,
        [rate.id]: "invalid",
      }));
      resetServerState();
      return;
    }

    setPromoStates((current) => ({
      ...current,
      [rate.id]: "valid",
    }));

    resetServerState();
  }

  const selectedLines = useMemo(() => {
    return rates
      .map((rate) => {
        const quantity = quantities[rate.id] || 0;

        let originalUnitAmount = 0;

        if (rate.type === "fixed") {
          originalUnitAmount = rate.amount || 0;
        }

        if (rate.type === "free_amount") {
          const enteredAmount = centsFromEuroInput(freeAmounts[rate.id] || "");
          const minimumAmount = rate.minimumAmount || 0;
          originalUnitAmount = Math.max(enteredAmount, minimumAmount);
        }

        const promoApplied = promoStates[rate.id] === "valid";
        const promoCode = promoApplied
          ? normalizePromoCode(rate.promoCode || "")
          : "";

        const discountedUnitAmount =
          promoApplied && canDisplayPromo(rate)
            ? applyPercentDiscount(
                originalUnitAmount,
                rate.promoDiscountPercent
              )
            : originalUnitAmount;

        const discountAmountPerUnit = Math.max(
          0,
          originalUnitAmount - discountedUnitAmount
        );

        return {
          rate,
          quantity,
          originalUnitAmount,
          unitAmount: discountedUnitAmount,
          discountAmountPerUnit,
          originalLineTotal: originalUnitAmount * quantity,
          lineTotal: discountedUnitAmount * quantity,
          discountTotal: discountAmountPerUnit * quantity,
          promoApplied,
          promoCode,
        };
      })
      .filter((line) => line.quantity > 0);
  }, [rates, quantities, freeAmounts, promoStates]);

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

  const totalDiscount = selectedLines.reduce(
    (sum, line) => sum + line.discountTotal,
    0
  );

  const suggestedContributionAmount =
    event.allowExtraDonation && ticketsTotal > 0
      ? suggestedContributionAmountFromSubtotal(
          ticketsTotal,
          event.extraDonationSuggestedPercent
        )
      : 0;

  useEffect(() => {
    if (!event.allowExtraDonation || suggestedContributionAmount <= 0) {
      if (!extraDonationTouched) {
        setExtraDonation("");
      }

      return;
    }

    if (!extraDonationTouched) {
      setExtraDonation(euroInputFromCents(suggestedContributionAmount));
    }
  }, [
    event.allowExtraDonation,
    suggestedContributionAmount,
    extraDonationTouched,
  ]);

  const rawExtraDonationAmount = event.allowExtraDonation
    ? centsFromEuroInput(extraDonation)
    : 0;

  const extraDonationAmount =
    suggestedContributionAmount > 0
      ? Math.min(rawExtraDonationAmount, suggestedContributionAmount)
      : 0;

  const totalAmount = ticketsTotal + extraDonationAmount;
  const hasSelection = selectedLines.length > 0;

  const participantsComplete =
    participantRows.length > 0 &&
    participantRows.every((row) => {
      const participant = participants[row.key];

      if (!participant) return false;

      const baseOk =
        participant.firstName.trim() &&
        participant.lastName.trim() &&
        participant.age.trim() &&
        participant.email.trim() &&
        isValidEmail(participant.email) &&
        participant.phone.trim() &&
        participant.originCity.trim();

      if (!baseOk) return false;

      return customFields.every((field) => {
        if (!field.isRequired) return true;
        return fieldValueIsFilled(field, participant.answers[field.fieldKey]);
      });
    });

  const formLooksReady = Boolean(hasSelection && participantsComplete);

  function getMainParticipantAsPayer() {
    const firstRow = participantRows[0];
    const firstParticipant = firstRow
      ? participants[firstRow.key] || emptyParticipant()
      : emptyParticipant();

    return {
      firstName: firstParticipant.firstName,
      lastName: firstParticipant.lastName,
      email: firstParticipant.email,
      phone: firstParticipant.phone,
    };
  }

  function updateExtraDonation(value: string) {
    setExtraDonation(value);
    setExtraDonationTouched(true);
    resetServerState();
  }

  function removeExtraDonation() {
    setExtraDonation("0");
    setExtraDonationTouched(true);
    resetServerState();
  }

  function restoreSuggestedDonation() {
    setExtraDonation(euroInputFromCents(suggestedContributionAmount));
    setExtraDonationTouched(false);
    resetServerState();
  }

  function buildPayload() {
    return {
      eventSlug: event.slug,
      payer: getMainParticipantAsPayer(),

      lines: selectedLines.map((line) => ({
        rateId: line.rate.id,
        quantity: line.quantity,
        originalUnitAmount: line.originalUnitAmount,
        unitAmount: line.unitAmount,
        promoCode: line.promoCode,
      })),

      participants: participantRows.map((row) => {
        const participant = participants[row.key] || emptyParticipant();

        return {
          rateId: row.rateId,
          firstName: participant.firstName,
          lastName: participant.lastName,
          age: participant.age,
          email: participant.email,
          phone: participant.phone,
          originCity: participant.originCity,
          answers: participant.answers,
        };
      }),

      extraDonationAmount,
    };
  }

  async function prepareRegistration() {
    if (!formLooksReady || preparing) return;

    setPreparing(true);
    setPrepareMessage("");
    setPreparedSummary(null);
    setCheckoutMessage("");

    try {
      const response = await fetch("/api/ticketing/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
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
        "Récapitulatif validé. Tu peux maintenant passer au paiement sécurisé."
      );
    } catch {
      setPrepareMessage("Erreur pendant la validation de l’inscription.");
    } finally {
      setPreparing(false);
    }
  }

  async function startStripeCheckout() {
    if (!preparedSummary || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutMessage("");

    try {
      const response = await fetch("/api/ticketing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      const data = await response.json();

      if (!response.ok || !data?.url) {
        setCheckoutMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de lancer le paiement sécurisé."
        );
        return;
      }

      window.location.href = data.url;
    } catch {
      setCheckoutMessage("Erreur pendant le lancement du paiement.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  function renderCustomField(rowKey: string, field: TicketingCustomField) {
    const participant = participants[rowKey] || emptyParticipant();
    const value = participant.answers[field.fieldKey];
    const label = `${field.label}${field.isRequired ? " *" : ""}`;

    if (field.type === "long_text") {
      return (
        <label key={field.id} style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 700 }}>{label}</span>
          <textarea
            className="input"
            rows={3}
            value={String(value || "")}
            onChange={(inputEvent) =>
              updateParticipantAnswer(
                rowKey,
                field.fieldKey,
                inputEvent.target.value
              )
            }
          />
        </label>
      );
    }

    if (field.type === "select") {
      return (
        <label key={field.id} style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontWeight: 700 }}>{label}</span>
          <select
            className="input"
            value={String(value || "")}
            onChange={(inputEvent) =>
              updateParticipantAnswer(
                rowKey,
                field.fieldKey,
                inputEvent.target.value
              )
            }
          >
            <option value="">Choisir</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (field.type === "checkbox") {
      return (
        <label
          key={field.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 700,
          }}
        >
          <input
            type="checkbox"
            checked={value === true}
            onChange={(inputEvent) =>
              updateParticipantAnswer(
                rowKey,
                field.fieldKey,
                inputEvent.target.checked
              )
            }
          />
          {label}
        </label>
      );
    }

    const inputType =
      field.type === "email"
        ? "email"
        : field.type === "phone"
          ? "tel"
          : field.type === "number"
            ? "number"
            : field.type === "date"
              ? "date"
              : "text";

    return (
      <label key={field.id} style={{ display: "grid", gap: "6px" }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <input
          className="input"
          type={inputType}
          value={String(value || "")}
          onChange={(inputEvent) =>
            updateParticipantAnswer(
              rowKey,
              field.fieldKey,
              inputEvent.target.value
            )
          }
        />
      </label>
    );
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
            border: "1px solid #bbf7d0",
            borderRadius: "999px",
            padding: "8px 12px",
            color: "#166534",
            fontSize: "13px",
            fontWeight: 700,
            background: "#f0fdf4",
          }}
        >
          Paiement sécurisé Stripe
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
            const promoState = promoStates[rate.id] || "idle";
            const promoVisible = canDisplayPromo(rate);

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

                {promoVisible ? (
                  <div style={{ display: "grid", gap: "10px" }}>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => togglePromo(rate.id)}
                      style={{ justifySelf: "start" }}
                    >
                      J’ai un code promo
                    </button>

                    {promoOpen[rate.id] ? (
                      <div
                        style={{
                          border:
                            promoState === "invalid"
                              ? "1px solid #fca5a5"
                              : promoState === "valid"
                                ? "1px solid #86efac"
                                : "1px solid #dbe3ee",
                          borderRadius: "14px",
                          padding: "12px",
                          background:
                            promoState === "invalid"
                              ? "#fef2f2"
                              : promoState === "valid"
                                ? "#f0fdf4"
                                : "#ffffff",
                          display: "grid",
                          gap: "10px",
                        }}
                      >
                        <label style={{ display: "grid", gap: "6px" }}>
                          <span style={{ fontWeight: 700 }}>Code promo</span>
                          <input
                            className="input"
                            value={promoInputs[rate.id] || ""}
                            onChange={(inputEvent) =>
                              updatePromoInput(rate.id, inputEvent.target.value)
                            }
                            placeholder="Entrer le code"
                          />
                        </label>

                        <button
                          type="button"
                          className="button"
                          onClick={() => applyPromoCode(rate)}
                          style={{ justifySelf: "start" }}
                        >
                          Appliquer
                        </button>

                        {promoState === "valid" ? (
                          <p
                            style={{
                              margin: 0,
                              color: "#166534",
                              fontWeight: 700,
                            }}
                          >
                            Code promo appliqué :{" "}
                            {rate.promoDiscountPercent || 0} % de réduction sur
                            ce tarif.
                          </p>
                        ) : null}

                        {promoState === "invalid" ? (
                          <p
                            style={{
                              margin: 0,
                              color: "#991b1b",
                              fontWeight: 700,
                            }}
                          >
                            Code promo invalide. Aucune réduction n’est
                            appliquée.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

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
            Renseigne les informations de chaque personne qui participera à
            l’événement. Le participant 1 servira aussi de contact principal
            pour l’inscription.
          </p>

          <div style={{ display: "grid", gap: "12px" }}>
            {participantRows.map((row, index) => {
              const participant = participants[row.key] || emptyParticipant();

              return (
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
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Prénom *</span>
                      <input
                        className="input"
                        value={participant.firstName}
                        onChange={(inputEvent) =>
                          updateParticipant(row.key, {
                            firstName: inputEvent.target.value,
                          })
                        }
                      />
                    </label>

                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Nom *</span>
                      <input
                        className="input"
                        value={participant.lastName}
                        onChange={(inputEvent) =>
                          updateParticipant(row.key, {
                            lastName: inputEvent.target.value,
                          })
                        }
                      />
                    </label>

                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Âge *</span>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={participant.age}
                        onChange={(inputEvent) =>
                          updateParticipant(row.key, {
                            age: inputEvent.target.value,
                          })
                        }
                      />
                    </label>

                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Email *</span>
                      <input
                        className="input"
                        type="email"
                        value={participant.email}
                        onChange={(inputEvent) =>
                          updateParticipant(row.key, {
                            email: inputEvent.target.value,
                          })
                        }
                      />
                    </label>

                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Téléphone *</span>
                      <input
                        className="input"
                        type="tel"
                        value={participant.phone}
                        onChange={(inputEvent) =>
                          updateParticipant(row.key, {
                            phone: inputEvent.target.value,
                          })
                        }
                      />
                    </label>

                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>
                        Ville d’origine *
                      </span>
                      <input
                        className="input"
                        value={participant.originCity}
                        onChange={(inputEvent) =>
                          updateParticipant(row.key, {
                            originCity: inputEvent.target.value,
                          })
                        }
                      />
                    </label>

                    {customFields.map((field) =>
                      renderCustomField(row.key, field)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {event.allowExtraDonation && suggestedContributionAmount > 0 ? (
        <div
          style={{
            marginTop: "12px",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "10px 12px",
            background: "#fcfcfd",
            color: "#64748b",
            fontSize: "12px",
            lineHeight: 1.35,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "720px" }}>
              <strong style={{ color: "#475569", fontSize: "12px" }}>
                Contribution facultative à Solidarité Cœur Actif
              </strong>{" "}
              <span>
                proposée automatiquement pour soutenir la plateforme et ses
                actions solidaires. Elle est indépendante du tarif de
                l’événement.
              </span>
            </div>

            <strong style={{ color: "#475569", fontSize: "13px" }}>
              {formatAmount(extraDonationAmount)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            <input
              value={extraDonation}
              onChange={(inputEvent) => updateExtraDonation(inputEvent.target.value)}
              style={{
                width: "90px",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "7px 9px",
                fontSize: "12px",
                color: "#475569",
                background: "#ffffff",
              }}
              inputMode="decimal"
              aria-label="Montant de la contribution facultative"
            />

            <button
              type="button"
              onClick={removeExtraDonation}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "999px",
                padding: "6px 9px",
                background: "#ffffff",
                color: "#64748b",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Retirer
            </button>

            {extraDonationTouched ? (
              <button
                type="button"
                onClick={restoreSuggestedDonation}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "999px",
                  padding: "6px 9px",
                  background: "#ffffff",
                  color: "#64748b",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Remettre la suggestion
              </button>
            ) : null}

            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Suggestion maximale : {formatAmount(suggestedContributionAmount)}
            </span>
          </div>
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
                  display: "grid",
                  gap: "4px",
                }}
              >
                <div
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

                {line.discountTotal > 0 ? (
                  <small style={{ color: "#166534", fontWeight: 700 }}>
                    Code promo appliqué : -{formatAmount(line.discountTotal)}
                  </small>
                ) : null}
              </div>
            ))}

            {totalDiscount > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  color: "#166534",
                  fontWeight: 800,
                }}
              >
                <span>Réduction totale</span>
                <span>-{formatAmount(totalDiscount)}</span>
              </div>
            ) : null}

            {extraDonationAmount > 0 ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                <span>Contribution SCA facultative</span>
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
              : "Compléter les informations obligatoires"}
        </button>

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
          <h3 style={{ margin: 0 }}>Récapitulatif validé</h3>

          <div>
            <strong>Référence provisoire :</strong>{" "}
            {preparedSummary.reference}
          </div>

          <div>
            <strong>Événement :</strong> {preparedSummary.event.title}
          </div>

          <div>
            <strong>Contact principal :</strong>{" "}
            {preparedSummary.payer.firstName} {preparedSummary.payer.lastName} —{" "}
            {preparedSummary.payer.email}
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <strong>Billets validés :</strong>

            {preparedSummary.lines.map((line) => (
              <div
                key={line.rateId}
                style={{
                  display: "grid",
                  gap: "4px",
                }}
              >
                <div
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

                {line.discountTotal > 0 ? (
                  <small style={{ color: "#166534", fontWeight: 700 }}>
                    Réduction validée serveur : -
                    {formatAmount(line.discountTotal)}
                  </small>
                ) : null}
              </div>
            ))}
          </div>

          <div>
            <strong>Participants :</strong>{" "}
            {preparedSummary.participants.length}
          </div>

          {preparedSummary.discountAmount > 0 ? (
            <div>
              <strong>Réduction totale :</strong> -
              {formatAmount(preparedSummary.discountAmount)}
            </div>
          ) : null}

          {preparedSummary.extraDonationAmount > 0 ? (
            <div style={{ color: "#64748b" }}>
              <strong>Contribution facultative SCA :</strong>{" "}
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
            Total à payer : {formatAmount(preparedSummary.totalAmount)}
          </div>

          <button
            type="button"
            className="button"
            disabled={checkoutLoading}
            onClick={startStripeCheckout}
            style={{
              opacity: checkoutLoading ? 0.65 : 1,
              cursor: checkoutLoading ? "not-allowed" : "pointer",
            }}
          >
            {checkoutLoading
              ? "Redirection vers Stripe..."
              : "Payer avec Stripe"}
          </button>

          {checkoutMessage ? (
            <div
              style={{
                border: "1px solid #fca5a5",
                borderRadius: "14px",
                padding: "12px",
                background: "#fef2f2",
                color: "#991b1b",
                fontWeight: 700,
              }}
            >
              {checkoutMessage}
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}