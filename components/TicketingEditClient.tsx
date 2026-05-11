"use client";

import { useState } from "react";
import type {
  TicketingCustomField,
  TicketingEvent,
  TicketingRate,
} from "@/lib/ticketing/types";
import TicketingFieldsEditorClient from "@/components/TicketingFieldsEditorClient";

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

function parseDonationAmounts(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim().replace(",", ".")))
    .filter((amount) => Number.isFinite(amount) && amount > 0)
    .map((amount) => Math.round(amount * 100));
}

function formatDonationAmounts(amounts: number[]) {
  return amounts.map((amount) => String(amount / 100)).join(", ");
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

function rateTypeLabel(type: DraftRateType) {
  if (type === "fixed") return "Prix fixe";
  if (type === "free_amount") return "Prix libre";
  return "Gratuit";
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

function sectionHeadingStyle(color: string) {
  return {
    marginTop: 0,
    marginBottom: "12px",
    color,
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

export default function TicketingEditClient({
  event,
  rates,
  fields,
  canManagePlatformContribution = true,
}: {
  event: TicketingEvent;
  rates: TicketingRate[];
  fields: TicketingCustomField[];
  canManagePlatformContribution?: boolean;
}) {
  const [title, setTitle] = useState(event.title);
  const [formTypeLabel, setFormTypeLabel] = useState(event.formTypeLabel || "");
  const [isVisible, setIsVisible] = useState(event.isVisible);
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
  const [allowExtraDonation, setAllowExtraDonation] = useState(
    event.allowExtraDonation
  );
  const [suggestedDonationAmounts, setSuggestedDonationAmounts] = useState(
    formatDonationAmounts(event.suggestedDonationAmounts || [])
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
      "Voulez-vous vraiment supprimer ce tarif de la billetterie ?"
    );

    if (!confirmed) return;

    setDraftRates((current) => current.filter((rate) => rate.id !== id));
  }

  async function saveChanges() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const eventResponse = await fetch(`/api/admin/ticketing/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          formTypeLabel,
          isVisible,
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
          allowExtraDonation,
          suggestedDonationAmounts: parseDonationAmounts(
            suggestedDonationAmounts
          ),
          confirmationEmailEnabled,
          confirmationEmailSubject,
          confirmationEmailMessage,
        }),
      });

      const eventData = await eventResponse.json();

      if (!eventResponse.ok) {
        setMessage(
          typeof eventData?.error === "string"
            ? eventData.error
            : "Impossible d’enregistrer les informations générales."
        );
        return;
      }

      const ratesResponse = await fetch(
        `/api/admin/ticketing/events/${event.id}/rates`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rates: draftRates,
          }),
        }
      );

      const ratesData = await ratesResponse.json();

      if (!ratesResponse.ok) {
        setMessage(
          typeof ratesData?.error === "string"
            ? ratesData.error
            : "Les informations générales ont été enregistrées, mais les tarifs n’ont pas pu être modifiés."
        );
        return;
      }

      setMessage("Modifications enregistrées.");

      setTimeout(() => {
        window.location.href = `/admin/billetteries/${event.slug}`;
      }, 700);
    } catch {
      setMessage("Erreur pendant l’enregistrement des modifications.");
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
            background: "#f8fafc",
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
        <h2 style={sectionHeadingStyle("#1d4ed8")}>Informations générales</h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Nom de la billetterie</span>
            <input
              className="input"
              value={title}
              onChange={(inputEvent) => setTitle(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Type de formulaire</span>
            <input
              className="input"
              value={formTypeLabel}
              onChange={(inputEvent) =>
                setFormTypeLabel(inputEvent.target.value)
              }
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Visibilité</span>
            <select
              className="input"
              value={isVisible ? "visible" : "hidden"}
              onChange={(inputEvent) =>
                setIsVisible(inputEvent.target.value === "visible")
              }
            >
              <option value="hidden">Masquée / brouillon</option>
              <option value="visible">Visible publiquement</option>
            </select>
          </label>
        </div>

        <label style={{ ...labelStyle(), marginTop: "14px" }}>
          <span style={labelTitleStyle()}>Description courte de l’événement</span>
          <textarea
            className="input"
            value={shortDescription}
            onChange={(inputEvent) =>
              setShortDescription(inputEvent.target.value)
            }
            rows={5}
            placeholder="Présentation courte affichée sur la page publique de la billetterie."
          />
        </label>
      </section>

      <section style={sectionStyle("#c4b5fd", "#fbfaff")}>
        <h2 style={sectionHeadingStyle("#6d28d9")}>Lieu et durée</h2>

        <div style={gridStyle(220)}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Lieu</span>
            <input
              className="input"
              value={locationName}
              onChange={(inputEvent) => setLocationName(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Adresse</span>
            <input
              className="input"
              value={addressLine}
              onChange={(inputEvent) => setAddressLine(inputEvent.target.value)}
              placeholder="Adresse complète ou complément"
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Code postal</span>
            <input
              className="input"
              value={postalCode}
              onChange={(inputEvent) => setPostalCode(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Ville</span>
            <input
              className="input"
              value={city}
              onChange={(inputEvent) => setCity(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Pays</span>
            <input
              className="input"
              value={country}
              onChange={(inputEvent) => setCountry(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Durée</span>
            <select
              className="input"
              value={durationType}
              onChange={(inputEvent) =>
                setDurationType(
                  inputEvent.target.value as "none" | "one_day" | "several_days"
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
              onChange={(inputEvent) => setStartsAt(inputEvent.target.value)}
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Fin</span>
            <input
              className="input"
              type="datetime-local"
              value={endsAt}
              onChange={(inputEvent) => setEndsAt(inputEvent.target.value)}
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
          {draftRates.length === 0 ? (
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Aucun tarif. Ajoute au moins un tarif avant de publier la
              billetterie.
            </p>
          ) : (
            draftRates.map((rate, index) => (
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
                      onChange={(inputEvent) =>
                        updateRate(rate.id, { name: inputEvent.target.value })
                      }
                      placeholder="Ex. Pass week-end"
                    />
                  </label>

                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Type</span>
                    <select
                      className="input"
                      value={rate.type}
                      onChange={(inputEvent) =>
                        updateRate(rate.id, {
                          type: inputEvent.target.value as DraftRateType,
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
                        onChange={(inputEvent) =>
                          updateRate(rate.id, { amount: inputEvent.target.value })
                        }
                        placeholder="Ex. 50"
                      />
                    </label>
                  ) : null}

                  {rate.type === "free_amount" ? (
                    <label style={labelStyle()}>
                      <span style={labelTitleStyle()}>Minimum (€)</span>
                      <input
                        className="input"
                        value={rate.minimumAmount}
                        onChange={(inputEvent) =>
                          updateRate(rate.id, {
                            minimumAmount: inputEvent.target.value,
                          })
                        }
                        placeholder="Ex. 50"
                      />
                    </label>
                  ) : null}

                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Limite totale</span>
                    <input
                      className="input"
                      value={rate.totalLimit}
                      onChange={(inputEvent) =>
                        updateRate(rate.id, { totalLimit: inputEvent.target.value })
                      }
                      placeholder="Optionnel"
                    />
                  </label>

                  <label style={labelStyle()}>
                    <span style={labelTitleStyle()}>Limite par commande</span>
                    <input
                      className="input"
                      value={rate.perOrderLimit}
                      onChange={(inputEvent) =>
                        updateRate(rate.id, {
                          perOrderLimit: inputEvent.target.value,
                        })
                      }
                      placeholder="Optionnel"
                    />
                  </label>
                </div>

                <label style={labelStyle()}>
                  <span style={labelTitleStyle()}>Description du tarif</span>
                  <textarea
                    className="input"
                    value={rate.description}
                    onChange={(inputEvent) =>
                      updateRate(rate.id, { description: inputEvent.target.value })
                    }
                    rows={3}
                    placeholder="Texte facultatif pour expliquer ce tarif."
                  />
                </label>

                <section
                  style={{
                    border: "1px solid #dbe3ee",
                    borderRadius: "14px",
                    padding: "14px",
                    background: "#f8fafc",
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
                    <div>
                      <strong>Code promo</strong>
                      <p style={{ margin: "4px 0 0", color: "#64748b" }}>
                        Réduction appliquée uniquement à ce tarif.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        updateRate(rate.id, {
                          promoCodeEnabled: !rate.promoCodeEnabled,
                        })
                      }
                    >
                      {rate.promoCodeEnabled
                        ? "Code promo activé"
                        : "Code promo désactivé"}
                    </button>
                  </div>

                  {rate.promoCodeEnabled ? (
                    <div style={{ display: "grid", gap: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                          flexWrap: "wrap",
                          border: rate.promoCodePublic
                            ? "1px solid #bbf7d0"
                            : "1px solid #e5e7eb",
                          background: rate.promoCodePublic ? "#f0fdf4" : "#ffffff",
                          borderRadius: "14px",
                          padding: "12px",
                        }}
                      >
                        <strong>
                          Affichage public : {rate.promoCodePublic ? "OUI" : "NON"}
                        </strong>

                        <button
                          type="button"
                          className="button secondary"
                          onClick={() =>
                            updateRate(rate.id, {
                              promoCodePublic: !rate.promoCodePublic,
                            })
                          }
                        >
                          {rate.promoCodePublic
                            ? "Ne pas afficher publiquement"
                            : "Afficher publiquement"}
                        </button>

                        <span style={{ color: "#64748b", fontSize: "13px" }}>
                          Si OUI, le bouton “J’ai un code promo” apparaîtra sur
                          la page publique.
                        </span>
                      </div>

                      <div style={gridStyle(220)}>
                        <label style={labelStyle()}>
                          <span style={labelTitleStyle()}>Code</span>
                          <input
                            className="input"
                            value={rate.promoCode}
                            onChange={(inputEvent) =>
                              updateRate(rate.id, {
                                promoCode: inputEvent.target.value
                                  .trim()
                                  .toUpperCase(),
                              })
                            }
                            placeholder="Ex. JEUNES2026"
                          />
                        </label>

                        <label style={labelStyle()}>
                          <span style={labelTitleStyle()}>
                            Réduction : {rate.promoDiscountPercent || "0"} %
                          </span>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={rate.promoDiscountPercent || "0"}
                            onChange={(inputEvent) =>
                              updateRate(rate.id, {
                                promoDiscountPercent: inputEvent.target.value,
                              })
                            }
                          />

                          <input
                            className="input"
                            value={rate.promoDiscountPercent}
                            onChange={(inputEvent) =>
                              updateRate(rate.id, {
                                promoDiscountPercent: inputEvent.target.value,
                              })
                            }
                            placeholder="Ex. 20"
                          />
                        </label>
                      </div>

                      <div style={{ color: "#64748b", fontSize: "13px" }}>
                        Aperçu code promo :{" "}
                        {rate.promoCode ? (
                          <>
                            <strong>{rate.promoCode}</strong> —{" "}
                            {rate.promoDiscountPercent || "0"} % de réduction —
                            {rate.promoCodePublic
                              ? " affiché publiquement"
                              : " non affiché publiquement"}
                          </>
                        ) : (
                          "aucun code défini"
                        )}
                      </div>
                    </div>
                  ) : null}
                </section>

                <div style={{ color: "#64748b", fontSize: "13px" }}>
                  Aperçu : {rate.name || "Tarif sans nom"} —{" "}
                  {rateTypeLabel(rate.type)}
                  {rate.type === "fixed" && rate.amount
                    ? ` — ${rate.amount} €`
                    : ""}
                  {rate.type === "free_amount" && rate.minimumAmount
                    ? ` — à partir de ${rate.minimumAmount} €`
                    : ""}
                  {!rate.isActive ? " — désactivé" : ""}
                  {rate.promoCodeEnabled && rate.promoCode
                    ? ` — code promo ${rate.promoCode} (${rate.promoDiscountPercent || "0"} %)`
                    : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <div
        style={{
          border: "1px solid #bbf7d0",
          borderRadius: "18px",
          background: "#f7fef9",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.045)",
        }}
      >
        <TicketingFieldsEditorClient event={event} fields={fields} />
      </div>

      <section style={sectionStyle("#fecaca", "#fffafa")}>
        <h2 style={sectionHeadingStyle("#b91c1c")}>Email de confirmation</h2>

        <p style={{ marginTop: 0, color: "#64748b", lineHeight: 1.6 }}>
          Cet email sera envoyé automatiquement après paiement validé. Le
          récapitulatif de l’inscription sera ajouté automatiquement sous ton
          message : référence, événement, participants, montant payé et contact.
        </p>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Envoi automatique</span>
            <select
              className="input"
              value={confirmationEmailEnabled ? "yes" : "no"}
              onChange={(inputEvent) =>
                setConfirmationEmailEnabled(inputEvent.target.value === "yes")
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
              onChange={(inputEvent) =>
                setConfirmationEmailSubject(inputEvent.target.value)
              }
              placeholder="Confirmation d’inscription – Nom de l’événement"
            />
          </label>
        </div>

        <label style={{ ...labelStyle(), marginTop: "14px" }}>
          <span style={labelTitleStyle()}>Message personnalisé</span>
          <textarea
            className="input"
            value={confirmationEmailMessage}
            onChange={(inputEvent) =>
              setConfirmationEmailMessage(inputEvent.target.value)
            }
            rows={8}
            placeholder="Bonjour, nous confirmons votre inscription. Voici les informations importantes à retenir pour cet événement..."
          />
        </label>

        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            border: "1px solid #fecaca",
            borderRadius: "14px",
            background: "#ffffff",
            color: "#64748b",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          Si l’objet est vide, le site utilisera automatiquement :{" "}
          <strong>
            Confirmation d’inscription – {title || "Titre de l’événement"}
          </strong>
          . Si le message est vide, un message simple par défaut sera utilisé.
        </div>
      </section>

      <section style={sectionStyle("#99f6e4", "#f5fffd")}>
        <h2 style={sectionHeadingStyle("#0f766e")}>Contact organisateur</h2>

        <div style={gridStyle()}>
          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Email organisateur</span>
            <input
              className="input"
              value={organizerEmail}
              onChange={(inputEvent) =>
                setOrganizerEmail(inputEvent.target.value)
              }
            />
          </label>

          <label style={labelStyle()}>
            <span style={labelTitleStyle()}>Téléphone organisateur</span>
            <input
              className="input"
              value={organizerPhone}
              onChange={(inputEvent) =>
                setOrganizerPhone(inputEvent.target.value)
              }
            />
          </label>
        </div>
      </section>

      {canManagePlatformContribution ? (
        <section style={sectionStyle("#bbf7d0", "#f7fef9")}>
          <h2 style={sectionHeadingStyle("#15803d")}>
            Contribution libre à Solidarité Cœur Actif
          </h2>

          <p style={{ marginTop: 0, color: "#64748b", lineHeight: 1.6 }}>
            Lorsqu’elle est activée, cette contribution est versée à Solidarité
            Cœur Actif. Elle permet de soutenir la mise à disposition de la
            plateforme, les frais techniques, le développement des outils et les
            actions solidaires de l’association. Elle est facultative et
            indépendante du tarif de l’événement.
          </p>

          <div style={gridStyle()}>
            <label style={labelStyle()}>
              <span style={labelTitleStyle()}>Contribution libre</span>
              <select
                className="input"
                value={allowExtraDonation ? "yes" : "no"}
                onChange={(inputEvent) =>
                  setAllowExtraDonation(inputEvent.target.value === "yes")
                }
              >
                <option value="yes">Proposer une contribution à SCA</option>
                <option value="no">Ne pas proposer de contribution</option>
              </select>
            </label>

            <label style={labelStyle()}>
              <span style={labelTitleStyle()}>Montants proposés</span>
              <input
                className="input"
                value={suggestedDonationAmounts}
                onChange={(inputEvent) =>
                  setSuggestedDonationAmounts(inputEvent.target.value)
                }
                placeholder="Ex. 5, 10, 20"
              />
            </label>
          </div>
        </section>
      ) : null}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          padding: "18px",
          border: "1px solid #dbe3ee",
          borderRadius: "18px",
          background: "#ffffff",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.045)",
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
          href={`/admin/billetteries/${event.slug}`}
          className="button secondary"
          style={{ textDecoration: "none" }}
        >
          Annuler
        </a>
      </div>
    </div>
  );
}