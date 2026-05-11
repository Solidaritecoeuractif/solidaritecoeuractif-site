"use client";

import { useState } from "react";
import type { TicketingCollaboratorAccess } from "@/lib/ticketing/types";

function statusLabel(status: string) {
  if (status === "active") return "Actif";
  if (status === "blocked") return "Bloqué";
  if (status === "deleted") return "Supprimé";
  return "En attente";
}

function statusStyle(status: string) {
  if (status === "active") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "blocked") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  return {
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
  };
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

export default function TicketingOrganizerAccessesClient({
  eventId,
  initialOrganizers,
}: {
  eventId: string;
  initialOrganizers: TicketingCollaboratorAccess[];
}) {
  const [organizers, setOrganizers] =
    useState<TicketingCollaboratorAccess[]>(initialOrganizers);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [canEditEvent, setCanEditEvent] = useState(true);
  const [canEditRates, setCanEditRates] = useState(true);
  const [canViewParticipants, setCanViewParticipants] = useState(true);
  const [canReceiveNotifications, setCanReceiveNotifications] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshOrganizers() {
    const response = await fetch(
      `/api/admin/ticketing/events/${eventId}/organizers`
    );

    const data = await response.json();

    if (response.ok && Array.isArray(data.organizers)) {
      setOrganizers(data.organizers);
    }
  }

  async function createOrganizer() {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/ticketing/events/${eventId}/organizers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            displayName,
            status: "pending_validation",
            canEditEvent,
            canEditRates,
            canViewParticipants,
            canReceiveNotifications,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de créer cet accès organisateur."
        );
        return;
      }

      setEmail("");
      setDisplayName("");
      setCanEditEvent(true);
      setCanEditRates(true);
      setCanViewParticipants(true);
      setCanReceiveNotifications(true);
      setMessage("Accès organisateur créé.");
      await refreshOrganizers();
    } catch {
      setMessage("Erreur pendant la création de l’accès organisateur.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOrganizer(
    organizer: TicketingCollaboratorAccess,
    patch: Partial<TicketingCollaboratorAccess>
  ) {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const next = {
        ...organizer,
        ...patch,
      };

      const response = await fetch(
        `/api/admin/ticketing/events/${eventId}/organizers`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: next.id,
            displayName: next.displayName || "",
            status: next.status,
            canEditEvent: next.canEditEvent,
            canEditRates: next.canEditRates,
            canViewParticipants: next.canViewParticipants,
            canReceiveNotifications: next.canReceiveNotifications,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de modifier cet accès organisateur."
        );
        return;
      }

      setMessage("Accès organisateur mis à jour.");
      await refreshOrganizers();
    } catch {
      setMessage("Erreur pendant la modification de l’accès organisateur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #c7d2fe",
        borderRadius: "18px",
        padding: "18px",
        background: "#f8faff",
        boxShadow: "0 12px 28px rgba(15, 23, 42, 0.045)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#3730a3" }}>
            Accès organisateurs
          </h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", lineHeight: 1.6 }}>
            Ajoute les personnes qui pourront gérer cette billetterie dans
            l’espace organisateur. La contribution Solidarité Cœur Actif ne sera
            pas visible dans leur interface.
          </p>
        </div>
      </div>

      {message ? (
        <div
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "14px",
            padding: "12px",
            background: "#ffffff",
            color:
              message.includes("Impossible") || message.includes("Erreur")
                ? "#991b1b"
                : "#166534",
            fontWeight: 800,
            marginBottom: "14px",
          }}
        >
          {message}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "14px",
          background: "#ffffff",
          display: "grid",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ margin: 0 }}>Ajouter un organisateur</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Email organisateur</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="organisateur@email.com"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Nom affiché</span>
            <input
              className="input"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Ex. Responsable inscriptions"
            />
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={canEditEvent}
              onChange={(event) => setCanEditEvent(event.target.checked)}
            />
            Modifier les informations de la billetterie
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={canEditRates}
              onChange={(event) => setCanEditRates(event.target.checked)}
            />
            Modifier les tarifs
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={canViewParticipants}
              onChange={(event) => setCanViewParticipants(event.target.checked)}
            />
            Voir les inscriptions
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={canReceiveNotifications}
              onChange={(event) =>
                setCanReceiveNotifications(event.target.checked)
              }
            />
            Recevoir les notifications
          </label>
        </div>

        <button
          type="button"
          className="button"
          onClick={createOrganizer}
          disabled={saving}
          style={{ justifySelf: "start" }}
        >
          {saving ? "Création..." : "Créer l’accès organisateur"}
        </button>
      </div>

      {organizers.length === 0 ? (
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Aucun organisateur n’a encore été ajouté pour cette billetterie.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            className="table"
            style={{
              width: "100%",
              minWidth: "980px",
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "240px" }}>Organisateur</th>
                <th style={{ width: "150px" }}>Statut</th>
                <th style={{ width: "260px" }}>Droits</th>
                <th style={{ width: "150px" }}>Créé le</th>
                <th style={{ width: "180px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {organizers.map((organizer) => (
                <tr key={organizer.id}>
                  <td>
                    <strong>{organizer.displayName || "Organisateur"}</strong>
                    <br />
                    <small style={{ color: "#64748b" }}>
                      {organizer.email}
                    </small>
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: 800,
                        ...statusStyle(organizer.status),
                      }}
                    >
                      {statusLabel(organizer.status)}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <label>
                        <input
                          type="checkbox"
                          checked={organizer.canEditEvent}
                          onChange={(event) =>
                            updateOrganizer(organizer, {
                              canEditEvent: event.target.checked,
                            })
                          }
                        />{" "}
                        Billetterie
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={organizer.canEditRates}
                          onChange={(event) =>
                            updateOrganizer(organizer, {
                              canEditRates: event.target.checked,
                            })
                          }
                        />{" "}
                        Tarifs
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={organizer.canViewParticipants}
                          onChange={(event) =>
                            updateOrganizer(organizer, {
                              canViewParticipants: event.target.checked,
                            })
                          }
                        />{" "}
                        Inscriptions
                      </label>

                      <label>
                        <input
                          type="checkbox"
                          checked={organizer.canReceiveNotifications}
                          onChange={(event) =>
                            updateOrganizer(organizer, {
                              canReceiveNotifications: event.target.checked,
                            })
                          }
                        />{" "}
                        Notifications
                      </label>
                    </div>
                  </td>

                  <td>{formatDate(organizer.createdAt)}</td>

                  <td>
                    <div style={{ display: "grid", gap: "8px" }}>
                      {organizer.status !== "active" ? (
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() =>
                            updateOrganizer(organizer, { status: "active" })
                          }
                          disabled={saving}
                        >
                          Activer
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button secondary small"
                          onClick={() =>
                            updateOrganizer(organizer, { status: "blocked" })
                          }
                          disabled={saving}
                        >
                          Bloquer
                        </button>
                      )}

                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() =>
                          updateOrganizer(organizer, { status: "deleted" })
                        }
                        disabled={saving}
                      >
                        Supprimer l’accès
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}