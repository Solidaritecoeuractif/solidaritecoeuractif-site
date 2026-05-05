"use client";

import { useMemo, useState } from "react";
import type { TicketingEvent } from "@/lib/ticketing/types";

type RateType = "fixed" | "free_amount" | "free";

type DraftRate = {
  id: string;
  name: string;
  type: RateType;
  amount: string;
  minimumAmount: string;
  totalLimit: string;
  perOrderLimit: string;
  isActive: boolean;
};

function rateTypeLabel(type: RateType) {
  if (type === "fixed") return "Prix fixe";
  if (type === "free_amount") return "Prix libre";
  return "Gratuit";
}

function newRate(): DraftRate {
  return {
    id: crypto.randomUUID(),
    name: "",
    type: "fixed",
    amount: "",
    minimumAmount: "",
    totalLimit: "",
    perOrderLimit: "",
    isActive: true,
  };
}

function parseDonationAmounts(value: string) {
  return String(value || "")
    .split(",")
    .map((item) => Number(item.trim().replace(",", ".")))
    .filter((amount) => Number.isFinite(amount) && amount > 0)
    .map((amount) => Math.round(amount * 100));
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(event: TicketingEvent) {
  if (event.status === "published" && event.isVisible) return "Visible";
  if (event.status === "archived") return "Archivée";
  if (event.status === "hidden") return "Masquée";
  return "Brouillon";
}

export default function TicketingDraftClient({
  initialEvents,
}: {
  initialEvents: TicketingEvent[];
}) {
  const [events, setEvents] = useState<TicketingEvent[]>(initialEvents);
  const [title, setTitle] = useState("Week-end de Ressourcement");
  const [formTypeLabel, setFormTypeLabel] = useState(
    "Séjour, week-end, séminaire"
  );
  const [isVisible, setIsVisible] = useState(false);
  const [locationName, setLocationName] = useState("22 rue de Triqueti");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("45200");
  const [city, setCity] = useState("Montargis");
  const [country, setCountry] = useState("France");
  const [durationType, setDurationType] = useState("none");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState(
    "solidaritecoeuractif@gmail.com"
  );
  const [organizerPhone, setOrganizerPhone] = useState("0745224124");
  const [shortDescription, setShortDescription] = useState("");
  const [allowExtraDonation, setAllowExtraDonation] = useState(true);
  const [suggestedDonationAmounts, setSuggestedDonationAmounts] =
    useState("5, 10, 20");
  const [rates, setRates] = useState<DraftRate[]>([
    {
      id: crypto.randomUUID(),
      name: "Pass",
      type: "free_amount",
      amount: "",
      minimumAmount: "50",
      totalLimit: "",
      perOrderLimit: "",
      isActive: true,
    },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const activeRatesCount = useMemo(
    () => rates.filter((rate) => rate.isActive).length,
    [rates]
  );

  function addRate() {
    setRates((current) => [...current, newRate()]);
  }

  function updateRate(id: string, patch: Partial<DraftRate>) {
    setRates((current) =>
      current.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate))
    );
  }

  function removeRate(id: string) {
    setRates((current) => current.filter((rate) => rate.id !== id));
  }

  async function saveTicketingEvent() {
    if (saving) return;

    setSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("/api/admin/ticketing/draft", {
        method: "POST",
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
          rates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSaveMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible d’enregistrer cette billetterie."
        );
        return;
      }

      setEvents((current) => [data.event, ...current]);
      setSaveMessage(`Billetterie enregistrée : ${data.event?.title || title}`);
    } catch {
      setSaveMessage("Erreur pendant l’enregistrement de la billetterie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Billetteries enregistrées</h2>

        {events.length === 0 ? (
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Aucune billetterie enregistrée pour le moment.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              className="table"
              style={{
                width: "100%",
                minWidth: "760px",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  <th style={{ width: "230px" }}>Nom</th>
                  <th style={{ width: "120px" }}>Statut</th>
                  <th style={{ width: "180px" }}>Lieu</th>
                  <th style={{ width: "150px" }}>Créée le</th>
                  <th style={{ width: "160px" }}>Lien public</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <strong>{event.title}</strong>
                      <br />
                      <small>{event.slug}</small>
                    </td>
                    <td>{statusLabel(event)}</td>
                    <td>
                      {[event.locationName, event.city, event.country]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                    <td>{formatDate(event.createdAt)}</td>
                    <td>
                      {event.isVisible ? (
                        <span style={{ color: "#166534", fontWeight: 700 }}>
                          /evenements/{event.slug}
                        </span>
                      ) : (
                        <span style={{ color: "#64748b" }}>Non publié</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div
        style={{
          border: "1px solid #facc15",
          borderRadius: "16px",
          padding: "14px",
          background: "#fffbeb",
          color: "#92400e",
          fontWeight: 600,
        }}
      >
        Enregistrement isolé : cette billetterie est sauvegardée dans les tables
        dédiées <code>ticketing_*</code>. Les commandes, offres, exports, panier
        et paiements existants du livre ne sont pas modifiés.
      </div>

      {saveMessage ? (
        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "14px",
            padding: "12px",
            background: "#f8fafc",
            color:
              saveMessage.includes("Impossible") ||
              saveMessage.includes("Erreur")
                ? "#991b1b"
                : "#166534",
            fontWeight: 600,
          }}
        >
          {saveMessage}
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
        <h2 style={{ marginTop: 0 }}>Nouvelle billetterie</h2>

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
              onChange={(event) => setDurationType(event.target.value)}
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
              {activeRatesCount} tarif(s) actif(s)
            </p>
          </div>

          <button type="button" className="button" onClick={addRate}>
            Ajouter un tarif
          </button>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          {rates.map((rate, index) => (
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
                        type: event.target.value as RateType,
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
                      updateRate(rate.id, { perOrderLimit: event.target.value })
                    }
                    placeholder="Optionnel"
                  />
                </label>
              </div>

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
              </div>
            </div>
          ))}
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
            rows={5}
            placeholder="Présentation courte affichée sur la page publique de la billetterie."
          />
        </label>
      </section>

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "18px",
          background: "#f8fafc",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Aperçu interne</h2>

        <div style={{ display: "grid", gap: "8px" }}>
          <div>
            <strong>Titre :</strong> {title || "Non renseigné"}
          </div>
          <div>
            <strong>Statut :</strong>{" "}
            {isVisible ? "Visible publiquement" : "Masquée / brouillon"}
          </div>
          <div>
            <strong>Lieu :</strong>{" "}
            {[locationName, addressLine, postalCode, city, country]
              .filter(Boolean)
              .join(", ")}
          </div>
          <div>
            <strong>Durée :</strong>{" "}
            {durationType === "none"
              ? "Sans durée définie"
              : durationType === "one_day"
                ? "Sur une journée"
                : "Sur plusieurs jours"}
          </div>
          <div>
            <strong>Tarifs :</strong>{" "}
            {rates.length === 0
              ? "Aucun tarif"
              : rates.map((rate) => rate.name || "Tarif sans nom").join(", ")}
          </div>
        </div>

        <div style={{ marginTop: "18px" }}>
          <button
            type="button"
            className="button"
            onClick={saveTicketingEvent}
            disabled={saving}
          >
            {saving ? "Enregistrement..." : "Enregistrer la billetterie"}
          </button>
        </div>
      </section>
    </div>
  );
}