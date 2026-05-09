import Link from "next/link";
import { notFound } from "next/navigation";
import { ticketingStorage } from "@/lib/ticketing";

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

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const storage = ticketingStorage();
  const event = await storage.getTicketingEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const orders = await storage.getTicketingOrders(event.id);

  const totalParticipants = orders.reduce(
    (sum, order) => sum + order.participants.length,
    0
  );

  const totalAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <main className="panel">
      <div
        style={{
          display: "grid",
          gap: "18px",
          maxWidth: "1180px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href={`/admin/billetteries/${event.slug}`} className="button secondary">
            Retour au détail
          </Link>

          <Link href="/admin/billetteries" className="button secondary">
            Toutes les billetteries
          </Link>

          <a
            href={`/api/admin/ticketing/events/${event.id}/export-csv`}
            className="button"
            style={{ textDecoration: "none" }}
          >
            Exporter les inscriptions CSV
          </a>
        </div>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "16px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Inscriptions billetterie
          </p>

          <h1 style={{ margin: 0 }}>{event.title}</h1>

          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Liste séparée des inscriptions liées à cette billetterie. Les
            commandes classiques du site ne sont pas affichées ici.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "16px",
              padding: "16px",
              background: "#ffffff",
            }}
          >
            <strong>Inscriptions</strong>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
              {orders.length}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "16px",
              padding: "16px",
              background: "#ffffff",
            }}
          >
            <strong>Participants</strong>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
              {totalParticipants}
            </div>
          </div>

          <div
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "16px",
              padding: "16px",
              background: "#ffffff",
            }}
          >
            <strong>Total inscrit</strong>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
              {formatAmount(totalAmount)}
            </div>
          </div>
        </section>

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
            <h2 style={{ margin: 0 }}>Liste des inscriptions</h2>

            <a
              href={`/api/admin/ticketing/events/${event.id}/export-csv`}
              className="button secondary"
              style={{ textDecoration: "none" }}
            >
              Télécharger CSV
            </a>
          </div>

          {orders.length === 0 ? (
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Aucune inscription enregistrée pour cette billetterie.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="table"
                style={{
                  width: "100%",
                  minWidth: "1060px",
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
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
                        <Link
                          href={`/admin/billetteries/${event.slug}/inscriptions/${order.reference}`}
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
                            {order.participants.slice(0, 4).map((participant, index) => (
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
                          href={`/admin/billetteries/${event.slug}/inscriptions/${order.reference}`}
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

        <section
          style={{
            border: "1px solid #facc15",
            borderRadius: "16px",
            padding: "14px",
            background: "#fffbeb",
            color: "#92400e",
            fontWeight: 600,
          }}
        >
          Cette page affiche uniquement les inscriptions billetterie stockées
          dans les tables dédiées. Elle ne modifie pas les commandes classiques,
          les offres, le panier, Stripe ou les exports existants.
        </section>
      </div>
    </main>
  );
}