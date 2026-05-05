"use client";

import { useState } from "react";
import type { TicketingEvent } from "@/lib/ticketing/types";

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

export default function TicketingEditClient({
  event,
}: {
  event: TicketingEvent;
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

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function saveChanges() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/ticketing/events/${event.id}`, {
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

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible d’enregistrer les modifications."
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
        Cette étape modifie uniquement les informations générales de cette
        billetterie. Les tarifs, inscriptions, paiements, commandes, offres,
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