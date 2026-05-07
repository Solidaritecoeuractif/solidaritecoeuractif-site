"use client";

import { useState } from "react";
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

export default function TicketingEditClient({
  event,
  rates,
}: {
  event: TicketingEvent;
  rates: TicketingRate[];
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
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      ) : null}

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Informations générales</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Nom de la billetterie</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Type de formulaire</span>
            <input
              className="input"
              value={formTypeLabel}
              onChange={(event) => setFormTypeLabel(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Visibilité</span>
            <select
              className="input"
              value={isVisible ? "visible" : "hidden"}
              onChange={(event) => setIsVisible(event.target.value === "visible")}
            >
              <option value="hidden">Masquée / brouillon</option>
              <option value="visible">Visible publiquement</option>
            </select>
          </label>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Lieu et durée</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Lieu</span>
            <input
              className="input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Adresse</span>
            <input
              className="input"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="Adresse complète ou complément"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Code postal</span>
            <input
              className="input"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Ville</span>
            <input
              className="input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Pays</span>
            <input
              className="input"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Durée</span>
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

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Début</span>
            <input
              className="input"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Fin</span>
            <input
              className="input"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
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
            <h2 style={{ margin: 0 }}>Tarifs</h2>
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
                  border: "1px solid #e5e7eb",
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
                  <strong>Tarif {index + 1}</strong>

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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Nom du tarif</span>
                    <input
                      className="input"
                      value={rate.name}
                      onChange={(event) =>
                        updateRate(rate.id, { name: event.target.value })
                      }
                      placeholder="Ex. Pass week-end"
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Type</span>
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
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Montant (€)</span>
                      <input
                        className="input"
                        value={rate.amount}
                        onChange={(event) =>
                          updateRate(rate.id, { amount: event.target.value })
                        }
                        placeholder="Ex. 50"
                      />
                    </label>
                  ) : null}

                  {rate.type === "free_amount" ? (
                    <label style={{ display: "grid", gap: "6px" }}>
                      <span style={{ fontWeight: 700 }}>Minimum (€)</span>
                      <input
                        className="input"
                        value={rate.minimumAmount}
                        onChange={(event) =>
                          updateRate(rate.id, {
                            minimumAmount: event.target.value,
                          })
                        }
                        placeholder="Ex. 50"
                      />
                    </label>
                  ) : null}

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Limite totale</span>
                    <input
                      className="input"
                      value={rate.totalLimit}
                      onChange={(event) =>
                        updateRate(rate.id, { totalLimit: event.target.value })
                      }
                      placeholder="Optionnel"
                    />
                  </label>

                  <label style={{ display: "grid", gap: "6px" }}>
                    <span style={{ fontWeight: 700 }}>Limite par commande</span>
                    <input
                      className="input"
                      value={rate.perOrderLimit}
                      onChange={(event) =>
                        updateRate(rate.id, {
                          perOrderLimit: event.target.value,
                        })
                      }
                      placeholder="Optionnel"
                    />
                  </label>
                </div>

                <label style={{ display: "grid", gap: "6px" }}>
                  <span style={{ fontWeight: 700 }}>Description du tarif</span>
                  <textarea
                    className="input"
                    value={rate.description}
                    onChange={(event) =>
                      updateRate(rate.id, { description: event.target.value })
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
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontWeight: 700,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={rate.promoCodePublic}
                          onChange={(event) =>
                            updateRate(rate.id, {
                              promoCodePublic: event.target.checked,
                            })
                          }
                        />
                        Afficher l’option “J’ai un code promo” sur la page
                        publique
                      </label>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        <label style={{ display: "grid", gap: "6px" }}>
                          <span style={{ fontWeight: 700 }}>Code</span>
                          <input
                            className="input"
                            value={rate.promoCode}
                            onChange={(event) =>
                              updateRate(rate.id, {
                                promoCode: event.target.value
                                  .trim()
                                  .toUpperCase(),
                              })
                            }
                            placeholder="Ex. JEUNES2026"
                          />
                        </label>

                        <label style={{ display: "grid", gap: "6px" }}>
                          <span style={{ fontWeight: 700 }}>
                            Réduction : {rate.promoDiscountPercent || "0"} %
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={rate.promoDiscountPercent || "0"}
                            onChange={(event) =>
                              updateRate(rate.id, {
                                promoDiscountPercent: event.target.value,
                              })
                            }
                          />
                          <input
                            className="input"
                            value={rate.promoDiscountPercent}
                            onChange={(event) =>
                              updateRate(rate.id, {
                                promoDiscountPercent: event.target.value,
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
                            {rate.promoDiscountPercent || "0"} % de réduction
                            {rate.promoCodePublic
                              ? " — affiché publiquement"
                              : " — non affiché publiquement"}
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

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Contact, description et contribution</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Email organisateur</span>
            <input
              className="input"
              value={organizerEmail}
              onChange={(event) => setOrganizerEmail(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Téléphone organisateur</span>
            <input
              className="input"
              value={organizerPhone}
              onChange={(event) => setOrganizerPhone(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Contribution libre</span>
            <select
              className="input"
              value={allowExtraDonation ? "yes" : "no"}
              onChange={(event) =>
                setAllowExtraDonation(event.target.value === "yes")
              }
            >
              <option value="yes">Proposer une contribution en plus</option>
              <option value="no">Ne pas proposer de contribution</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 700 }}>Montants proposés</span>
            <input
              className="input"
              value={suggestedDonationAmounts}
              onChange={(event) =>
                setSuggestedDonationAmounts(event.target.value)
              }
              placeholder="Ex. 5, 10, 20"
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "6px", marginTop: "14px" }}>
          <span style={{ fontWeight: 700 }}>Description courte</span>
          <textarea
            className="input"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            rows={6}
            placeholder="Présentation courte affichée sur la page publique de la billetterie."
          />
        </label>
      </section>

      <section
        style={{
          border: "1px solid #facc15",
          borderRadius: "16px",
          padding: "14px",
          background: "#fffbeb",
          color: "#92400e",
          fontWeight: 600,
        }}
      >
        Cette étape modifie uniquement les informations générales et les tarifs
        de cette billetterie. Les inscriptions, paiements, commandes, offres,
        panier, Stripe et exports existants ne sont pas modifiés.
      </section>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
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