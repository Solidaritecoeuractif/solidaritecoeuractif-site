"use client";

import { useState, type FormEvent } from "react";
import { DEFAULT_DELIVERY_MESSAGE, type CustomerMessages } from "@/lib/customer-messages";

export default function CustomerMessagesForm({ initialValue }: { initialValue: CustomerMessages }) {
  const [deliveryMessage, setDeliveryMessage] = useState(initialValue.deliveryMessage);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/messages-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryMessage }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Enregistrement impossible.");
      setDeliveryMessage(result.deliveryMessage);
      setNotice("Message enregistré. Il sera utilisé dans les prochaines confirmations avec livraison.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={save} style={{ maxWidth: 900 }}>
      <label className="full" htmlFor="delivery-message">
        <span>Délai et informations de livraison</span>
        <textarea id="delivery-message" value={deliveryMessage} required maxLength={2000} rows={8} disabled={saving}
          aria-describedby="delivery-message-help"
          onChange={event => { setDeliveryMessage(event.target.value); setNotice(""); setError(""); }} />
      </label>
      <p className="full" id="delivery-message-help">Vous pouvez modifier tout ce texte, y compris le délai. Précisez s’il inclut le traitement, l’expédition et l’acheminement. Les messages déjà envoyés restent inchangés.</p>
      <div className="full" style={{ padding: 20, border: "1px solid #d7dfd8", borderRadius: 12, background: "#f5f8f3" }}>
        <h2 style={{ marginTop: 0 }}>Aperçu du paragraphe dans le courriel</h2>
        <p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere", marginBottom: 0 }}>{deliveryMessage}</p>
      </div>
      <div className="full" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <button type="submit" className="button" disabled={saving || !deliveryMessage.trim()}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" className="button secondary" disabled={saving} onClick={() => { setDeliveryMessage(DEFAULT_DELIVERY_MESSAGE); setNotice(""); setError(""); }}>Reprendre le texte proposé</button>
      </div>
      {notice ? <p className="full success-note" role="status">{notice}</p> : null}
      {error ? <p className="full error-note" role="alert">{error}</p> : null}
    </form>
  );
}
