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

function paymentStatusLabel(status: string) {
  if (status === "paid") return "Payée";
  if (status === "cancelled") return "Annulée";
  return "En attente";
}

function paymentStatusStyle(status: string) {
  if (status === "paid") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "cancelled") {
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

function exportUrl(eventId: string, format: "csv" | "xlsx", references?: string[]) {
  const params = new URLSearchParams();

  if (references && references.length > 0) {
    params.set("references", references.join(","));
  }

  const query = params.toString();
  const route =
    format === "xlsx"
      ? `/api/admin/ticketing/events/${eventId}/export-xlsx`
      : `/api/admin/ticketing/events/${eventId}/export-csv`;

  return `${route}${query ? `?${query}` : ""}`;
}

export default function TicketingPaidOrdersTableClient({
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
        borderRadius: "16px",
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
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
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
            <span style={{ fontSize: "13px", fontWeight: 700 }}>
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
            fontWeight: 700,
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
              minWidth: "1120px",
              tableLayout: "fixed",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "60px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th style={{ width: "160px" }}>Référence</th>
                <th style={{ width: "210px" }}>Contact</th>
                <th style={{ width: "120px" }}>Statut</th>
                <th style={{ width: "120px" }}>Participants</th>
                <th style={{ width: "130px" }}>Total</th>
                <th style={{ width: "150px" }}>Créée le</th>
                <th style={{ width: "260px" }}>Détail participants</th>
                <th style={{ width: "110px" }}>Action</th>
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
                    <Link
                      href={`/admin/billetteries/${eventSlug}/inscriptions/${order.reference}`}
                      style={{
                        fontWeight: 800,
                        color: "#111827",
                        textDecoration: "none",
                      }}
                    >
                      {order.reference}
                    </Link>
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
                      {order.payerPhone}
                    </small>
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: 800,
                        ...paymentStatusStyle(order.paymentStatus),
                      }}
                    >
                      {paymentStatusLabel(order.paymentStatus)}
                    </span>
                  </td>

                  <td>
                    <strong>{order.participants.length}</strong>
                  </td>

                  <td>
                    <strong>{formatAmount(order.totalAmount)}</strong>
                    {order.extraDonationAmount > 0 ? (
                      <>
                        <br />
                        <small style={{ color: "#64748b" }}>
                          Don : {formatAmount(order.extraDonationAmount)}
                        </small>
                      </>
                    ) : null}
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
                      href={`/admin/billetteries/${eventSlug}/inscriptions/${order.reference}`}
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