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
      dateStyle: "long",
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
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;

  const storage = ticketingStorage();

  const event = await storage.getTicketingEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const order = await storage.getTicketingOrderByReference(reference);

  if (!order || order.eventId !== event.id) {
    notFound();
  }

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
          <Link
            href={`/admin/billetteries/${event.slug}/inscriptions`}
            className="button secondary"
          >
            Retour aux inscriptions
          </Link>

          <Link href={`/admin/billetteries/${event.slug}`} className="button secondary">
            Retour à la billetterie
          </Link>
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
            Détail inscription billetterie
          </p>

          <h1 style={{ margin: 0 }}>{order.reference}</h1>

          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Cette inscription appartient à la billetterie :{" "}
            <strong>{event.title}</strong>.
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
            <strong>Statut</strong>
            <div style={{ marginTop: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  padding: "7px 12px",
                  fontSize: "13px",
                  fontWeight: 800,
                  ...paymentStatusStyle(order.paymentStatus),
                }}
              >
                {paymentStatusLabel(order.paymentStatus)}
              </span>
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
            <strong>Total</strong>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
              {formatAmount(order.totalAmount)}
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
              {order.participants.length}
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
            <strong>Créée le</strong>
            <div style={{ marginTop: "6px" }}>{formatDate(order.createdAt)}</div>
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
          <h2 style={{ marginTop: 0 }}>Payeur</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Nom complet</strong>
              <br />
              {order.payerFirstName} {order.payerLastName}
            </div>

            <div>
              <strong>Email</strong>
              <br />
              <a href={`mailto:${order.payerEmail}`}>{order.payerEmail}</a>
            </div>

            <div>
              <strong>Téléphone</strong>
              <br />
              {order.payerPhone || "—"}
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
          <h2 style={{ marginTop: 0 }}>Montants</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Sous-total billets</strong>
              <br />
              {formatAmount(order.subtotalAmount)}
            </div>

            <div>
              <strong>Contribution libre</strong>
              <br />
              {formatAmount(order.extraDonationAmount)}
            </div>

            <div>
              <strong>Total</strong>
              <br />
              <span style={{ fontWeight: 800 }}>{formatAmount(order.totalAmount)}</span>
            </div>

            <div>
              <strong>Devise</strong>
              <br />
              {order.currency.toUpperCase()}
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
          <h2 style={{ marginTop: 0 }}>Participants</h2>

          {order.participants.length === 0 ? (
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Aucun participant enregistré.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="table"
                style={{
                  width: "100%",
                  minWidth: "720px",
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: "70px" }}>N°</th>
                    <th style={{ width: "220px" }}>Prénom</th>
                    <th style={{ width: "220px" }}>Nom</th>
                    <th style={{ width: "260px" }}>Tarif</th>
                  </tr>
                </thead>

                <tbody>
                  {order.participants.map((participant, index) => (
                    <tr key={participant.id}>
                      <td>{index + 1}</td>
                      <td>{participant.firstName}</td>
                      <td>{participant.lastName}</td>
                      <td>
                        <small style={{ color: "#64748b" }}>
                          {participant.rateId}
                        </small>
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
          Cette page est en lecture seule. Elle affiche uniquement une
          inscription billetterie stockée dans les tables dédiées. Les commandes
          classiques, offres, panier, Stripe et exports existants ne sont pas
          modifiés.
        </section>
      </div>
    </main>
  );
}