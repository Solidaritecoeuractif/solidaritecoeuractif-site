"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TicketingEvent } from "@/lib/ticketing/types";

export default function TicketingEventStatusActions({
  event,
}: {
  event: TicketingEvent;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function updateStatus(action: "publish" | "hide" | "archive") {
    if (saving) return;

    if (action === "archive") {
      const confirmed = window.confirm(
        `Archiver la billetterie "${event.title}" ? Elle ne sera plus visible publiquement, mais l’historique restera conservé.`
      );

      if (!confirmed) return;
    }

    if (action === "hide") {
      const confirmed = window.confirm(
        `Masquer la billetterie "${event.title}" ? Elle ne sera plus accessible au public.`
      );

      if (!confirmed) return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/ticketing/events/${event.id}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de modifier le statut."
        );
        return;
      }

      setMessage("Statut mis à jour.");
      router.refresh();
    } catch {
      setMessage("Erreur pendant la modification du statut.");
    } finally {
      setSaving(false);
    }
  }

  const isPublished = event.status === "published" && event.isVisible;
  const isArchived = event.status === "archived";

  return (
    <section
      style={{
        border: "1px solid #dbe3ee",
        borderRadius: "16px",
        padding: "18px",
        background: "#ffffff",
        display: "grid",
        gap: "12px",
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Publication</h2>
        <p style={{ margin: "6px 0 0", color: "#64748b" }}>
          Gère la visibilité publique de cette billetterie sans supprimer les
          données.
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          className="button"
          disabled={saving || isPublished}
          onClick={() => updateStatus("publish")}
          style={{
            opacity: saving || isPublished ? 0.55 : 1,
            cursor: saving || isPublished ? "not-allowed" : "pointer",
          }}
        >
          Publier
        </button>

        <button
          type="button"
          className="button secondary"
          disabled={saving || !isPublished}
          onClick={() => updateStatus("hide")}
          style={{
            opacity: saving || !isPublished ? 0.55 : 1,
            cursor: saving || !isPublished ? "not-allowed" : "pointer",
          }}
        >
          Masquer
        </button>

        <button
          type="button"
          className="button secondary"
          disabled={saving || isArchived}
          onClick={() => updateStatus("archive")}
          style={{
            opacity: saving || isArchived ? 0.55 : 1,
            cursor: saving || isArchived ? "not-allowed" : "pointer",
          }}
        >
          Archiver
        </button>
      </div>

      {message ? (
        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "12px",
            padding: "10px",
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
    </section>
  );
}