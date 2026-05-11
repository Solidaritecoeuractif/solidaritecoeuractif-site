"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TicketingOrder } from "@/lib/ticketing/types";

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return "—";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
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

function exportUrl(eventId: string, format: "csv" | "xlsx", references?: string[]) {
  const params = new URLSearchParams();

  if (references && references.length > 0) {
    params.set("references", references.join(","));
  }

  const query = params.toString();

  const route =
    format === "xlsx"
      ? `/api/organisateur/billetteries/${eventId}/export-xlsx`
      : `/api/organisateur/billetteries/${eventId}/export-csv`;

  return `${route}${query ? `?${query}` : ""}`;
}

export default function OrganizerPaidOrdersTableClient({
  eventId,
  eventSlug,
  orders,
}: {
  eventId: string;
  eventSlug: string;
  orders: TicketingOrder[];
}) {
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const allReferences = useMemo(
    () => orders.map((order) => order.reference),
    [orders]
  );

  const selectedSet = useMemo(
    () => new Set(selectedReferences),
    [selectedReferences]
  );

  const allSelected =
    orders.length > 0 && selectedReferences.length === orders.length;

  function toggleOne(reference: string) {
    setMessage("");

    setSelectedReferences((current) =>
      current.includes(reference)
        ? current.filter((item) => item !== reference)
        : [...current, reference]
    );
  }

  function toggleAll() {
    setMessage("");
    setSelectedReferences(allSelected ? [] : allReferences);
  }

  function handleExportAll(format: string) {
    setMessage("");

    if (format === "csv" || format === "xlsx") {
      window.location.href = exportUrl(eventId, format);
    }
  }

  function handleExportSelection(format: string) {
    setMessage("");

    if (selectedReferences.length === 0) {
      setMessage("Sélectionne au moins une inscription à exporter.");
      return;
    }

    if (format === "csv" || format === "xlsx") {
      window.location.href = exportUrl(eventId, format, selectedReferences);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #dbe3ee",
        borderRadius: "18px",
        padding: "18px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Liste des inscriptions</h2>

          {selectedReferences.length > 0 ? (
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              {selectedReferences.length} inscription(s) sélectionnée(s)
            </p>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: "4px", minWidth: "210px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800 }}>
              Exporter toutes les inscriptions
            </span>

            <select
              className="input"
              defaultValue=""
              onChange={(event) => {
                handleExportAll(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="" disabled>
                Choisir un format
              </option>
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
          </label>

          <label
            style={{
              display: "grid",
              gap: "4px",
              minWidth: "210px",
              opacity: selectedReferences.length === 0 ? 0.6 : 1,
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 800 }}>
              Exporter la sélection
            </span>

            <select
              className="input"
              defaultValue=""
              disabled={selectedReferences.length === 0}
              onChange={(event) => {
                handleExportSelection(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="" disabled>
                Choisir un format
              </option>
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </select>
          </label>
        </div>
      </div>

      {message ? (
        <div
          style={{
            border: "1px solid #fde68a",
            borderRadius: "14px",
            padding: "12px",
            background: "#fffbeb",
            color: "#92400e",
            fontWeight: 800,
            marginBottom: "14px",
          }}
        >
          {message}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <p style={{ color: "#64748b", marginBottom: 0 }}>
          Aucune inscription payée enregistrée pour cette billetterie.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            className="table"
            style={{
              width: "100%",
              minWidth: "1040px",
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "58px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th style={{ width: "160px" }}>Référence</th>
                <th style={{ width: "220px" }}>Contact</th>
                <th style={{ width: "120px" }}>Participants</th>
                <th style={{ width: "150px" }}>Montant événement</th>
                <th style={{ width: "150px" }}>Créée le</th>
                <th style={{ width: "260px" }}>Détail participants</th>
                <th style={{ width: "120px" }}>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(order.reference)}
                      onChange={() => toggleOne(order.reference)}
                      aria-label={`Sélectionner ${order.reference}`}
                    />
                  </td>

                  <td>
                    <strong>{order.reference}</strong>
                  </td>

                  <td>
                    <strong>
                      {order.payerFirstName} {order.payerLastName}
                    </strong>
                    <br />
                    <small style={{ color: "#64748b" }}>
                      {order.payerEmail}
                    </small>
                    <br />
                    <small style={{ color: "#64748b" }}>
                      {order.payerPhone || "—"}
                    </small>
                  </td>

                  <td>
                    <strong>{order.participants.length}</strong>
                  </td>

                  <td>
                    <strong>{formatAmount(order.subtotalAmount)}</strong>
                  </td>

                  <td>{formatDate(order.createdAt)}</td>

                  <td>
                    {order.participants.length === 0 ? (
                      <span style={{ color: "#64748b" }}>—</span>
                    ) : (
                      <div style={{ display: "grid", gap: "4px" }}>
                        {order.participants
                          .slice(0, 4)
                          .map((participant, index) => (
                            <div key={participant.id}>
                              <small>
                                {index + 1}. {participant.firstName}{" "}
                                {participant.lastName}
                              </small>
                            </div>
                          ))}

                        {order.participants.length > 4 ? (
                          <small style={{ color: "#64748b" }}>
                            + {order.participants.length - 4} autre(s)
                          </small>
                        ) : null}
                      </div>
                    )}
                  </td>

                  <td>
                    <Link
                      href={`/organisateur/billetteries/${eventSlug}/inscriptions/${order.reference}`}
                      className="button secondary small"
                      style={{
                        display: "inline-flex",
                        justifyContent: "center",
                        width: "100%",
                        textDecoration: "none",
                      }}
                    >
                      Ouvrir
                    </Link>
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