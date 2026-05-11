"use client";

import { useState } from "react";
import type { TicketingEvent } from "@/lib/ticketing/types";

export default function OrganizerTicketingPublicationActions({
  event,
}: {
  event: TicketingEvent;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isPublic = event.status === "published" && event.isVisible;

  async function updatePublication(action: "publish" | "hide") {
    if (loading) return;

    const confirmed =
      action === "publish"
        ? window.confirm(
            "Voulez-vous publier cette billetterie et rendre la page accessible au public ?"
          )
        : window.confirm(
            "Voulez-vous masquer cette billetterie et fermer l’accès public ?"
          );

    if (!confirmed) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/organisateur/billetteries/${event.id}/publication`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de modifier la publication."
        );
        return;
      }

      window.location.reload();
    } catch {
      setMessage("Erreur pendant la modification de la publication.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        border: isPublic ? "1px solid #bbf7d0" : "1px solid #fde68a",
        borderRadius: "18px",
        padding: "16px",
        background: isPublic ? "#f0fdf4" : "#fffbeb",
        display: "grid",
        gap: "12px",
      }}
    >
      <div>
        <strong style={{ color: isPublic ? "#166534" : "#92400e" }}>
          Publication publique
        </strong>

        <p
          style={{
            margin: "6px 0 0",
            color: "#64748b",
            lineHeight: 1.6,
          }}
        >
          {isPublic
            ? "Cette billetterie est publiée. Les participants peuvent accéder à la page publique et s’inscrire."
            : "Cette billetterie n’est pas encore publique. Publie-la pour obtenir un lien accessible aux participants."}
        </p>
      </div>

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

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {isPublic ? (
          <>
            <a
              href={`/evenements/${event.slug}`}
              target="_blank"
              className="button"
              style={{ textDecoration: "none" }}
            >
              Voir la page publique
            </a>

            <button
              type="button"
              className="button secondary"
              onClick={() => updatePublication("hide")}
              disabled={loading}
            >
              {loading ? "Modification..." : "Masquer la billetterie"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="button"
            onClick={() => updatePublication("publish")}
            disabled={loading}
          >
            {loading ? "Publication..." : "Publier la billetterie"}
          </button>
        )}
      </div>
    </section>
  );
}