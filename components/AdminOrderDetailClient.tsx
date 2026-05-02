"use client";

import { useState } from "react";

type Order = {
  reference: string;
  paymentStatus: string;
  logisticsStatus: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    country?: string;
    city?: string;
    postalCode?: string;
    address1?: string;
    address2?: string;
    notes?: string;
  };
  items: Array<{
    quantity: number;
  }>;
};

export default function AdminOrderDetailClient({ order }: { order: Order }) {
  const [form, setForm] = useState({
    firstName: order.customer.firstName || "",
    lastName: order.customer.lastName || "",
    email: order.customer.email || "",
    phone: order.customer.phone || "",
    country: order.shippingAddress?.country || "",
    city: order.shippingAddress?.city || "",
    postalCode: order.shippingAddress?.postalCode || "",
    address1: order.shippingAddress?.address1 || "",
    address2: order.shippingAddress?.address2 || "",
    notes: order.shippingAddress?.notes || "",
    logisticsStatus: order.logisticsStatus || "",
    quantity: String(order.items?.[0]?.quantity || 1),
  });

  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(key: string, value: string) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveChanges() {
    setBusy(true);
    setSaved(false);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/orders/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: order.reference,
          customer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
          },
          shippingAddress: {
            country: form.country,
            city: form.city,
            postalCode: form.postalCode,
            address1: form.address1,
            address2: form.address2,
            notes: form.notes,
          },
          logisticsStatus: form.logisticsStatus,
          quantity: Number(form.quantity),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de modifier la commande."
        );
      }

      setSaved(true);
      setMessage("Commande mise à jour avec succès.");

      setTimeout(() => {
        window.location.href = `/admin/orders/${order.reference}?t=${Date.now()}`;
      }, 1000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de modifier la commande."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="panel" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ margin: 0 }}>Informations client et livraison</h2>

          <button
            type="button"
            onClick={saveChanges}
            disabled={busy}
            className="button"
            style={{
              background: saved ? "#0b7a4b" : "#12223d",
              color: "#ffffff",
              border: "1px solid transparent",
            }}
          >
            {busy ? "Enregistrement..." : saved ? "Enregistré" : "Enregistrer les modifications"}
          </button>
        </div>

        {message ? (
          <p className="success-note" style={{ marginTop: 12 }}>
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="error-note" style={{ marginTop: 12 }}>
            {error}
          </p>
        ) : null}
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Informations client</h2>
        <div className="form-grid">
          <label>
            <span>Prénom</span>
            <input
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
            />
          </label>

          <label>
            <span>Nom</span>
            <input
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </label>

          <label>
            <span>Téléphone</span>
            <input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Données saisies pour la livraison</h2>
        <div className="form-grid">
          <label>
            <span>Pays</span>
            <input
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            />
          </label>

          <label>
            <span>Ville</span>
            <input
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </label>

          <label>
            <span>Code postal</span>
            <input
              value={form.postalCode}
              onChange={(e) => update("postalCode", e.target.value)}
            />
          </label>

          <label>
            <span>Statut logistique</span>
            <select
              value={form.logisticsStatus}
              onChange={(e) => update("logisticsStatus", e.target.value)}
            >
              <option value="to_process">À traiter</option>
              <option value="prepared">Préparé</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
              <option value="cancelled">Annulé</option>
            </select>
          </label>

          <label>
            <span>Quantité</span>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
            />
          </label>

          <label className="full">
            <span>Adresse</span>
            <input
              value={form.address1}
              onChange={(e) => update("address1", e.target.value)}
            />
          </label>

          <label className="full">
            <span>Complément d’adresse</span>
            <input
              value={form.address2}
              onChange={(e) => update("address2", e.target.value)}
            />
          </label>

          <label className="full">
            <span>Informations complémentaires</span>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Commande</h2>
        <div className="form-grid">
          <label>
            <span>Statut de paiement</span>
            <input value={order.paymentStatus || ""} readOnly />
          </label>

          <label>
            <span>Référence</span>
            <input value={order.reference || ""} readOnly />
          </label>
        </div>
      </section>
    </>
  );
}