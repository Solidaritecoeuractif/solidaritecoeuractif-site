"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TicketingEvent } from "@/lib/ticketing/types";

export default function TicketingDeleteEventButton({
  event,
  ordersCount,
}: {
  event: TicketingEvent;
  ordersCount: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  const canDelete = ordersCount === 0;

  async function deleteEvent() {
    if (!canDelete || deleting) return;

    const firstConfirm = window.confirm(
      `Supprimer définitivement la billetterie "${event.title}" ? Cette action est irréversible.`
    );

    if (!firstConfirm) return;

    const typed = window.prompt(
      `Pour confirmer, tapez exactement : SUPPRIMER`
    );

    if (typed !== "SUPPRIMER") {
      setMessage("Suppression annulée : confirmation incorrecte.");
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/ticketing/events/${event.id}/delete`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de supprimer cette billetterie."
        );
        return;
      }

      router.push("/admin/billetteries");
      router.refresh();
    } catch {
      setMessage("Erreur pendant la suppression de la billetterie.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      style={{
        border: canDelete ? "1px solid #fecaca" : "1px solid #fde68a",
        borderRadius: "16px",
        padding: "18px",
        background: canDelete ? "#fef2f2" : "#fffbeb",
        color: canDelete ? "#991b1b" : "#92400e",
        display: "grid",
        gap: "12px",
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Zone sensible</h2>

        {canDelete ? (
          <p style={{ marginBottom: 0, fontWeight: 600 }}>
            Cette billetterie ne contient aucune inscription. Elle peut être
            supprimée définitivement avec confirmation.
          </p>
        ) : (
          <p style={{ marginBottom: 0, fontWeight: 600 }}>
            Suppression bloquée : cette billetterie contient déjà{" "}
            {ordersCount} inscription(s). Il vaut mieux la masquer ou
            l’archiver pour conserver l’historique.
          </p>
        )}
      </div>

      <button
        type="button"
        className="button secondary"
        onClick={deleteEvent}
        disabled={!canDelete || deleting}
        style={{
          justifySelf: "start",
          opacity: !canDelete || deleting ? 0.55 : 1,
          cursor: !canDelete || deleting ? "not-allowed" : "pointer",
        }}
      >
        {deleting ? "Suppression..." : "Supprimer définitivement"}
      </button>

      {message ? (
        <div
          style={{
            border: "1px solid currentColor",
            borderRadius: "12px",
            padding: "10px",
            fontWeight: 700,
          }}
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}