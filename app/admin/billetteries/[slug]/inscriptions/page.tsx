import Link from "next/link";
import { notFound } from "next/navigation";
import TicketingPaidOrdersTableClient from "@/components/TicketingPaidOrdersTableClient";
import { ticketingStorage } from "@/lib/ticketing";

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return "—";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
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

  const allOrders = await storage.getTicketingOrders(event.id);
  const orders = allOrders.filter((order) => order.paymentStatus === "paid");

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
          <Link
            href={`/admin/billetteries/${event.slug}`}
            className="button secondary"
          >
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
            Exporter toutes les inscriptions payées CSV
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
            Liste séparée des inscriptions payées liées à cette billetterie. Les
            inscriptions en attente, les commandes classiques du site et les
            paiements non finalisés ne sont pas affichés ici.
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
            <strong>Inscriptions payées</strong>
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
            <strong>Total encaissé</strong>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
              {formatAmount(totalAmount)}
            </div>
          </div>
        </section>

        <TicketingPaidOrdersTableClient
          eventId={event.id}
          eventSlug={event.slug}
          orders={orders}
        />

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
          Cette page affiche uniquement les inscriptions billetterie payées,
          stockées dans les tables dédiées. Elle ne modifie pas les commandes
          classiques, les offres, le panier, Stripe ou les exports existants.
        </section>
      </div>
    </main>
  );
}