"use client";

import { useState } from "react";

export default function OrganizerNewTicketingClient({
  organizerEmail,
}: {
  organizerEmail: string;
}) {
  const [title, setTitle] = useState("");
  const [formTypeLabel, setFormTypeLabel] = useState("Billetterie");
  const [locationName, setLocationName] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("France");
  const [durationType, setDurationType] = useState("none");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [organizerEmailValue, setOrganizerEmailValue] = useState(
    organizerEmail || ""
  );
  const [organizerPhone, setOrganizerPhone] = useState("");

  const [rateName, setRateName] = useState("");
  const [rateDescription, setRateDescription] = useState("");
  const [rateType, setRateType] = useState("fixed");
  const [amount, setAmount] = useState("");
  const [minimumAmount, setMinimumAmount] = useState("");
  const [totalQuantityLimit, setTotalQuantityLimit] = useState("");
  const [quantityPerOrderLimit, setQuantityPerOrderLimit] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/organisateur/billetteries", {
        method: "POST",
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
          shortDescription,
          organizerEmail: organizerEmailValue,
          organizerPhone,

          rateName,
          rateDescription,
          rateType,
          amount,
          minimumAmount,
          totalQuantityLimit,
          quantityPerOrderLimit,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de créer cette billetterie."
        );
        return;
      }

      window.location.href = data.redirectTo || "/organisateur/billetteries";
    } catch {
      setMessage("Erreur pendant la création de la billetterie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "18px" }}>
      {message ? (
        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: "14px",
            padding: "12px",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <section
        style={{
          border: "1px solid #bfdbfe",
          borderRadius: "18px",
          padding: "18px",
          background: "#f8fbff",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#1d4ed8" }}>
          Informations générales
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Nom de la billetterie</span>
            <input
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Nom de votre événement"
              required
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Type de formulaire</span>
            <input
              className="input"
              value={formTypeLabel}
              onChange={(event) => setFormTypeLabel(event.target.value)}
              placeholder="Ex. Inscription, réservation, participation..."
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "6px", marginTop: "14px" }}>
          <span style={{ fontWeight: 800 }}>Description courte</span>
          <textarea
            className="input"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            rows={5}
            placeholder="Présente brièvement l’événement."
          />
        </label>
      </section>

      <section
        style={{
          border: "1px solid #c4b5fd",
          borderRadius: "18px",
          padding: "18px",
          background: "#fbfaff",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#6d28d9" }}>Lieu et durée</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Lieu</span>
            <input
              className="input"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              placeholder="Nom du lieu"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Adresse</span>
            <input
              className="input"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              placeholder="Adresse"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Code postal</span>
            <input
              className="input"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Ville</span>
            <input
              className="input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Pays</span>
            <input
              className="input"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Durée</span>
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
            <span style={{ fontWeight: 800 }}>Début</span>
            <input
              className="input"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Fin</span>
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
          border: "1px solid #fed7aa",
          borderRadius: "18px",
          padding: "18px",
          background: "#fffaf5",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#c2410c" }}>Premier tarif</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Nom du tarif</span>
            <input
              className="input"
              value={rateName}
              onChange={(event) => setRateName(event.target.value)}
              placeholder="Ex. Pass week-end"
              required
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Type</span>
            <select
              className="input"
              value={rateType}
              onChange={(event) => setRateType(event.target.value)}
            >
              <option value="fixed">Prix fixe</option>
              <option value="free_amount">Prix libre avec minimum</option>
              <option value="free">Gratuit</option>
            </select>
          </label>

          {rateType === "fixed" ? (
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontWeight: 800 }}>Montant (€)</span>
              <input
                className="input"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ex. 50"
                required
              />
            </label>
          ) : null}

          {rateType === "free_amount" ? (
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontWeight: 800 }}>Minimum (€)</span>
              <input
                className="input"
                value={minimumAmount}
                onChange={(event) => setMinimumAmount(event.target.value)}
                placeholder="Ex. 20"
                required
              />
            </label>
          ) : null}

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Limite totale</span>
            <input
              className="input"
              value={totalQuantityLimit}
              onChange={(event) => setTotalQuantityLimit(event.target.value)}
              placeholder="Optionnel"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Limite par commande</span>
            <input
              className="input"
              value={quantityPerOrderLimit}
              onChange={(event) => setQuantityPerOrderLimit(event.target.value)}
              placeholder="Optionnel"
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: "6px", marginTop: "14px" }}>
          <span style={{ fontWeight: 800 }}>Description du tarif</span>
          <textarea
            className="input"
            value={rateDescription}
            onChange={(event) => setRateDescription(event.target.value)}
            rows={3}
            placeholder="Texte facultatif pour expliquer ce tarif."
          />
        </label>
      </section>

      <section
        style={{
          border: "1px solid #99f6e4",
          borderRadius: "18px",
          padding: "18px",
          background: "#f5fffd",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#0f766e" }}>
          Contact organisateur
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Email de contact</span>
            <input
              className="input"
              type="email"
              value={organizerEmailValue}
              onChange={(event) => setOrganizerEmailValue(event.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Téléphone de contact</span>
            <input
              className="input"
              value={organizerPhone}
              onChange={(event) => setOrganizerPhone(event.target.value)}
            />
          </label>
        </div>
      </section>

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
        <button type="submit" className="button" disabled={saving}>
          {saving ? "Création..." : "Créer la billetterie en brouillon"}
        </button>

        <a
          href="/organisateur/billetteries"
          className="button secondary"
          style={{ textDecoration: "none" }}
        >
          Annuler
        </a>
      </section>
    </form>
  );
}