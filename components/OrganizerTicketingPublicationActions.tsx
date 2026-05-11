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
  const publicPath = `/evenements/${event.slug}`;
  const previewPath = `/evenements/${event.slug}?preview=organizer`;

  function getAbsoluteUrl(path: string) {
    if (typeof window === "undefined") {
      return path;
    }

    return `${window.location.origin}${path}`;
  }

  async function copyPublicLink() {
    setMessage("");

    const publicUrl = getAbsoluteUrl(publicPath);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = publicUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setMessage("Lien public copié.");
    } catch {
      setMessage("Impossible de copier le lien. Tu peux l’ouvrir puis copier l’adresse.");
    }
  }

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
            : "Cette billetterie n’est pas encore publique. Tu peux la prévisualiser avant de la publier."}
        </p>

        {isPublic ? (
          <div
            style={{
              marginTop: "10px",
              padding: "10px 12px",
              border: "1px solid #dcfce7",
              borderRadius: "14px",
              background: "#ffffff",
              color: "#166534",
              fontWeight: 700,
              wordBreak: "break-word",
            }}
          >
            {getAbsoluteUrl(publicPath)}
          </div>
        ) : null}
      </div>

      {message ? (
        <div
          style={{
            border: message.includes("Impossible")
              ? "1px solid #fecaca"
              : "1px solid #bbf7d0",
            borderRadius: "14px",
            padding: "12px",
            background: message.includes("Impossible") ? "#fef2f2" : "#f0fdf4",
            color: message.includes("Impossible") ? "#991b1b" : "#166534",
            fontWeight: 800,
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <a
          href={previewPath}
          target="_blank"
          className="button secondary"
          style={{ textDecoration: "none" }}
        >
          Prévisualiser la page
        </a>

        {isPublic ? (
          <>
            <a
              href={publicPath}
              target="_blank"
              className="button"
              style={{ textDecoration: "none" }}
            >
              Voir la page publique
            </a>

            <button
              type="button"
              className="button secondary"
              onClick={copyPublicLink}
            >
              Copier le lien public
            </button>

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