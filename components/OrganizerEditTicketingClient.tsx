"use client";

import { useState, type ReactNode } from "react";
import type { TicketingEvent, TicketingRate } from "@/lib/ticketing/types";

type DraftRateType = "fixed" | "free_amount" | "free";

type DraftRate = {
  id: string;
  name: string;
  description: string;
  type: DraftRateType;
  amount: string;
  minimumAmount: string;
  totalLimit: string;
  perOrderLimit: string;
  isActive: boolean;
  promoCodeEnabled: boolean;
  promoCodePublic: boolean;
  promoCode: string;
  promoDiscountPercent: string;
  createdAt?: string;
};

function toDateTimeLocalValue(value?: string) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);

  return local.toISOString().slice(0, 16);
}

function centsToEuros(value?: number) {
  if (typeof value !== "number") return "";
  return String(value / 100);
}

function optionalNumberToString(value?: number) {
  if (typeof value !== "number") return "";
  return String(value);
}

function normalizePercent(value?: number) {
  if (typeof value !== "number") return "0";
  return String(Math.max(0, Math.min(100, Math.round(value))));
}

function cleanPercent(value: string) {
  const number = Number(String(value || "").trim());

  if (!Number.isFinite(number)) return "0";

  return String(Math.max(0, Math.min(100, Math.round(number))));
}

function toDraftRate(rate: TicketingRate): DraftRate {
  return {
    id: rate.id,
    name: rate.name,
    description: rate.description || "",
    type: rate.type,
    amount: centsToEuros(rate.amount),
    minimumAmount: centsToEuros(rate.minimumAmount),
    totalLimit: optionalNumberToString(rate.totalQuantityLimit),
    perOrderLimit: optionalNumberToString(rate.quantityPerOrderLimit),
    isActive: rate.isActive,
    promoCodeEnabled: Boolean(rate.promoCodeEnabled),
    promoCodePublic: Boolean(rate.promoCodePublic),
    promoCode: rate.promoCode || "",
    promoDiscountPercent: normalizePercent(rate.promoDiscountPercent),
    createdAt: rate.createdAt,
  };
}

function newDraftRate(): DraftRate {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
    type: "fixed",
    amount: "",
    minimumAmount: "",
    totalLimit: "",
    perOrderLimit: "",
    isActive: true,
    promoCodeEnabled: false,
    promoCodePublic: false,
    promoCode: "",
    promoDiscountPercent: "0",
    createdAt: new Date().toISOString(),
  };
}

function sectionStyle(accent: string, background: string) {
  return {
    border: `1px solid ${accent}`,
    borderRadius: "18px",
    padding: "18px",
    background,
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.045)",
  } as const;
}

function gridStyle(minWidth = 240) {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: "14px",
  } as const;
}

function labelStyle() {
  return {
    display: "grid",
    gap: "6px",
  } as const;
}

function labelTitleStyle() {
  return {
    fontWeight: 800,
    color: "#1e293b",
  } as const;
}

export default function OrganizerEditTicketingClient({
  event,
  rates,
  extraSection,
}: {
  event: TicketingEvent;
  rates: TicketingRate[];
  extraSection?: ReactNode;
}) {
  const [title, setTitle] = useState(event.title);
  const [formTypeLabel, setFormTypeLabel] = useState(event.formTypeLabel || "");
  const [locationName, setLocationName] = useState(event.locationName || "");
  const [addressLine, setAddressLine] = useState(event.addressLine || "");
  const [postalCode, setPostalCode] = useState(event.postalCode || "");
  const [city, setCity] = useState(event.city || "");
  const [country, setCountry] = useState(event.country || "");
  const [durationType, setDurationType] = useState(event.durationType);
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(event.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocalValue(event.endsAt));
  const [organizerEmail, setOrganizerEmail] = useState(
    event.organizerEmail || ""
  );
  const [organizerPhone, setOrganizerPhone] = useState(
    event.organizerPhone || ""
  );
  const [shortDescription, setShortDescription] = useState(
    event.shortDescription || ""
  );

  const [confirmationEmailEnabled, setConfirmationEmailEnabled] = useState(
    event.confirmationEmailEnabled !== false
  );
  const [confirmationEmailSubject, setConfirmationEmailSubject] = useState(
    event.confirmationEmailSubject || ""
  );
  const [confirmationEmailMessage, setConfirmationEmailMessage] = useState(
    event.confirmationEmailMessage || ""
  );

  const [draftRates, setDraftRates] = useState<DraftRate[]>(
    rates.length > 0 ? rates.map(toDraftRate) : [newDraftRate()]
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function addRate() {
    setDraftRates((current) => [...current, newDraftRate()]);
  }

  function updateRate(id: string, patch: Partial<DraftRate>) {
    setDraftRates((current) =>
      current.map((rate) => {
        if (rate.id !== id) return rate;

        const next = { ...rate, ...patch };

        if (patch.promoCodeEnabled === false) {
          next.promoCodePublic = false;
        }

        if (Object.prototype.hasOwnProperty.call(patch, "promoDiscountPercent")) {
          next.promoDiscountPercent = cleanPercent(
            String(patch.promoDiscountPercent || "0")
          );
        }

        return next;
      })
    );
  }

  function duplicateRate(id: string) {
    const rate = draftRates.find((entry) => entry.id === id);

    if (!rate) return;

    setDraftRates((current) => [
      ...current,
      {
        ...rate,
        id: crypto.randomUUID(),
        name: `${rate.name || "Tarif"} copie`,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function removeRate(id: string) {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce tarif ?"
    );

    if (!confirmed) return;

    setDraftRates((current) => current.filter((rate) => rate.id !== id));
  }

  async function saveChanges() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/organisateur/billetteries/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          formTypeLabel,
          locationName,
          addressLine,
          postalCode,
          city,
          country,
          durationType,
          startsAt,
          endsAt,
          organizerEmail,
          organizerPhone,
          shortDescription,
          confirmationEmailEnabled,
          confirmationEmailSubject,
          confirmationEmailMessage,
          rates: draftRates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible d’enregistrer cette billetterie."
        );
        return;
      }

      setMessage("Billetterie enregistrée.");

      setTimeout(() => {
        window.location.href = `/organisateur/billetteries/${event.slug}`;
      }, 700);
    } catch {
      setMessage("Erreur pendant l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      {message ? (
        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "14px",
            padding: "12px",
            background: "#ffffff",
            color:
              message.includes("Impossible") || message.includes("Erreur")
                ? "#991b1b"
                : "#166534",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <section style={sectionStyle("#bfdbfe", "#f8fbff")}>
        <h2 style={{ marginTop: 0, color: "#1d4ed8" }}>
          Informations générales
        </h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Nom de la billetterie</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Type de formulaire</span>
            <input
              className="input"
              value={formTypeLabel}
              onChange={(event) => setFormTypeLabel(event.target.value)}
            />
          </label>
        </div>

        <label style={{ ...labelStyle(), marginTop: "14px" }}>
          <span style={labelTitleStyle()}>Description courte</span>
          <textarea
            className="input"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            rows={5}
          />
        </label>
      </section>

      <section style={sectionStyle("#c4b5fd", "#fbfaff")}>
        <h2 style={{ marginTop: 0, color: "#6d28d9" }}>Lieu et durée</h2>

        <div style={gridStyle(220)}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Lieu</span>
            <input
              className="input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Adresse</span>
            <input
              className="input"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Code postal</span>
            <input
              className="input"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Ville</span>
            <input
              className="input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Pays</span>
            <input
              className="input"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Durée</span>
            <select
              className="input"
              value={durationType}
              onChange={(event) =>
                setDurationType(
                  event.target.value as "none" | "one_day" | "several_days"
                )
              }
            >
              <option value="none">Sans durée définie</option>
              <option value="one_day">Sur une journée</option>
              <option value="several_days">Sur plusieurs jours</option>
            </select>
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Début</span>
            <input
              className="input"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Fin</span>
            <input
              className="input"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section style={sectionStyle("#fed7aa", "#fffaf5")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: "14px",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "#c2410c" }}>Tarifs</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              {draftRates.filter((rate) => rate.isActive).length} tarif(s)
              actif(s)
            </p>
          </div>

          <button type="button" className="button" onClick={addRate}>
            Ajouter un tarif
          </button>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {draftRates.map((rate, index) => (
            <div
              key={rate.id}
              style={{
                border: "1px solid #fed7aa",
                borderRadius: "14px",
                padding: "14px",
                background: "#ffffff",
                display: "grid",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <strong style={{ color: "#9a3412" }}>Tarif {index + 1}</strong>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      updateRate(rate.id, { isActive: !rate.isActive })
                    }
                  >
                    {rate.isActive ? "Désactiver" : "Activer"}
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => duplicateRate(rate.id)}
                  >
                    Dupliquer
                  </button>

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => removeRate(rate.id)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>

              <div style={gridStyle(180)}>
                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Nom du tarif</span>
                  <input
                    className="input"
                    value={rate.name}
                    onChange={(event) =>
                      updateRate(rate.id, { name: event.target.value })
                    }
                  />
                </label>

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Type</span>
                  <select
                    className="input"
                    value={rate.type}
                    onChange={(event) =>
                      updateRate(rate.id, {
                        type: event.target.value as DraftRateType,
                      })
                    }
                  >
                    <option value="fixed">Prix fixe</option>
                    <option value="free_amount">Prix libre</option>
                    <option value="free">Gratuit</option>
                  </select>
                </label>

                {rate.type === "fixed" ? (
                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Montant (€)</span>
                    <input
                      className="input"
                      value={rate.amount}
                      onChange={(event) =>
                        updateRate(rate.id, { amount: event.target.value })
                      }
                    />
                  </label>
                ) : null}

                {rate.type === "free_amount" ? (
                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Minimum (€)</span>
                    <input
                      className="input"
                      value={rate.minimumAmount}
                      onChange={(event) =>
                        updateRate(rate.id, {
                          minimumAmount: event.target.value,
                        })
                      }
                    />
                  </label>
                ) : null}

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Limite totale</span>
                  <input
                    className="input"
                    value={rate.totalLimit}
                    onChange={(event) =>
                      updateRate(rate.id, { totalLimit: event.target.value })
                    }
                  />
                </label>

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Limite par commande</span>
                  <input
                    className="input"
                    value={rate.perOrderLimit}
                    onChange={(event) =>
                      updateRate(rate.id, { perOrderLimit: event.target.value })
                    }
                  />
                </label>
              </div>

              <label style={labelStyle()}>
                <span style={labelTitleStyle()}>Description du tarif</span>
                <textarea
                  className="input"
                  value={rate.description}
                  onChange={(event) =>
                    updateRate(rate.id, { description: event.target.value })
                  }
                  rows={3}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle("#fecaca", "#fffafa")}>
        <h2 style={{ marginTop: 0, color: "#b91c1c" }}>
          Email de confirmation
        </h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Envoi automatique</span>
            <select
              className="input"
              value={confirmationEmailEnabled ? "yes" : "no"}
              onChange={(event) =>
                setConfirmationEmailEnabled(event.target.value === "yes")
              }
            >
              <option value="yes">Activé après paiement</option>
              <option value="no">Désactivé pour cette billetterie</option>
            </select>
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Objet de l’email</span>
            <input
              className="input"
              value={confirmationEmailSubject}
              onChange={(event) =>
                setConfirmationEmailSubject(event.target.value)
              }
            />
          </label>
        </div>

        <label style={{ ...labelStyle(), marginTop: "14px" }}>
          <span style={labelTitleStyle()}>Message personnalisé</span>
          <textarea
            className="input"
            value={confirmationEmailMessage}
            onChange={(event) =>
              setConfirmationEmailMessage(event.target.value)
            }
            rows={7}
          />
        </label>
      </section>

      <section style={sectionStyle("#99f6e4", "#f5fffd")}>
        <h2 style={{ marginTop: 0, color: "#0f766e" }}>Contact organisateur</h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Email organisateur</span>
            <input
              className="input"
              value={organizerEmail}
              onChange={(event) => setOrganizerEmail(event.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Téléphone organisateur</span>
            <input
              className="input"
              value={organizerPhone}
              onChange={(event) => setOrganizerPhone(event.target.value)}
            />
          </label>
        </div>
      </section>

      {extraSection ? <div>{extraSection}</div> : null}

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "18px",
          padding: "16px",
          background: "#ffffff",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="button"
          onClick={saveChanges}
          disabled={saving}
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>

        <a
          href={`/organisateur/billetteries/${event.slug}`}
          className="button secondary"
          style={{ textDecoration: "none" }}
        >
          Annuler
        </a>
      </section>
    </div>
  );
}