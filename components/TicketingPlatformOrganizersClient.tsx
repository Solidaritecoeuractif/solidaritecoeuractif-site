"use client";

import { useMemo, useState } from "react";
import type { TicketingOrganizerAccount } from "@/lib/ticketing/types";

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

export default function TicketingPlatformOrganizersClient({
  initialOrganizers,
}: {
  initialOrganizers: TicketingOrganizerAccount[];
}) {
  const [organizers, setOrganizers] =
    useState<TicketingOrganizerAccount[]>(initialOrganizers);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [canCreateEvents, setCanCreateEvents] = useState(true);
  const [canReceiveNotifications, setCanReceiveNotifications] = useState(true);
  const [createAsActive, setCreateAsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const activeCount = useMemo(
    () => organizers.filter((organizer) => organizer.status === "active").length,
    [organizers]
  );

  const pendingCount = useMemo(
    () =>
      organizers.filter(
        (organizer) => organizer.status === "pending_validation"
      ).length,
    [organizers]
  );

  const blockedCount = useMemo(
    () =>
      organizers.filter((organizer) => organizer.status === "blocked").length,
    [organizers]
  );

  async function refreshOrganizers() {
    const response = await fetch("/api/admin/ticketing/organizers");
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
      const response = await fetch("/api/admin/ticketing/organizers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName,
          status: createAsActive ? "active" : "pending_validation",
          canCreateEvents,
          canReceiveNotifications,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de créer cet organisateur."
        );
        return;
      }

      setEmail("");
      setDisplayName("");
      setCanCreateEvents(true);
      setCanReceiveNotifications(true);
      setCreateAsActive(true);
      setMessage("Organisateur créé.");
      await refreshOrganizers();
    } catch {
      setMessage("Erreur pendant la création de l’organisateur.");
    } finally {
      setSaving(false);
    }
  }

  async function updateOrganizer(
    organizer: TicketingOrganizerAccount,
    patch: Partial<TicketingOrganizerAccount>
  ) {
    if (saving) return;

    setSaving(true);
    setMessage("");

    try {
      const next = {
        ...organizer,
        ...patch,
      };

      const response = await fetch("/api/admin/ticketing/organizers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: next.id,
          email: next.email,
          displayName: next.displayName || "",
          status: next.status,
          canCreateEvents: next.canCreateEvents,
          canReceiveNotifications: next.canReceiveNotifications,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de modifier cet organisateur."
        );
        return;
      }

      setMessage("Organisateur mis à jour.");
      await refreshOrganizers();
    } catch {
      setMessage("Erreur pendant la modification de l’organisateur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: "18px" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px",
        }}
      >
        <div
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: "16px",
            padding: "16px",
            background: "#f0fdf4",
          }}
        >
          <strong>Actifs</strong>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
            {activeCount}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #fde68a",
            borderRadius: "16px",
            padding: "16px",
            background: "#fffbeb",
          }}
        >
          <strong>En attente</strong>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
            {pendingCount}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #fecaca",
            borderRadius: "16px",
            padding: "16px",
            background: "#fef2f2",
          }}
        >
          <strong>Bloqués</strong>
          <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
            {blockedCount}
          </div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #c7d2fe",
          borderRadius: "18px",
          padding: "18px",
          background: "#f8faff",
          boxShadow: "0 12px 28px rgba(15, 23, 42, 0.045)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#3730a3" }}>
          Créer un organisateur
        </h2>

        <p style={{ color: "#64748b", lineHeight: 1.6, marginTop: 0 }}>
          Ces organisateurs pourront ensuite accéder à leur propre espace et
          créer leurs billetteries. Ils ne verront pas la contribution
          Solidarité Cœur Actif dans leurs paramètres.
        </p>

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
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "14px",
          }}
        >
          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Email</span>
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
              placeholder="Ex. Association partenaire"
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontWeight: 800 }}>Statut initial</span>
            <select
              className="input"
              value={createAsActive ? "active" : "pending_validation"}
              onChange={(event) =>
                setCreateAsActive(event.target.value === "active")
              }
            >
              <option value="active">Actif immédiatement</option>
              <option value="pending_validation">En attente</option>
            </select>
          </label>
        </div>

        <div
          style={{
            marginTop: "14px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "10px",
          }}
        >
          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={canCreateEvents}
              onChange={(event) => setCanCreateEvents(event.target.checked)}
            />
            Peut créer des billetteries
          </label>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={canReceiveNotifications}
              onChange={(event) =>
                setCanReceiveNotifications(event.target.checked)
              }
            />
            Peut recevoir les notifications
          </label>
        </div>

        <button
          type="button"
          className="button"
          onClick={createOrganizer}
          disabled={saving}
          style={{ marginTop: "14px" }}
        >
          {saving ? "Création..." : "Créer l’organisateur"}
        </button>
      </section>

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "18px",
          padding: "18px",
          background: "#ffffff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Organisateurs enregistrés</h2>

        {organizers.length === 0 ? (
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Aucun organisateur de plateforme n’a encore été créé.
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
                  <th style={{ width: "260px" }}>Organisateur</th>
                  <th style={{ width: "140px" }}>Statut</th>
                  <th style={{ width: "260px" }}>Droits</th>
                  <th style={{ width: "160px" }}>Créé le</th>
                  <th style={{ width: "190px" }}>Actions</th>
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
                      <div style={{ display: "grid", gap: "5px" }}>
                        <label>
                          <input
                            type="checkbox"
                            checked={organizer.canCreateEvents}
                            onChange={(event) =>
                              updateOrganizer(organizer, {
                                canCreateEvents: event.target.checked,
                              })
                            }
                          />{" "}
                          Création de billetteries
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
                              updateOrganizer(organizer, {
                                status: "active",
                              })
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
                              updateOrganizer(organizer, {
                                status: "blocked",
                              })
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
                            updateOrganizer(organizer, {
                              status: "deleted",
                            })
                          }
                          disabled={saving}
                        >
                          Supprimer
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
    </div>
  );
}