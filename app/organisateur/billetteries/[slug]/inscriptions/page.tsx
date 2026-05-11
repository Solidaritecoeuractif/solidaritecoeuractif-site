import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OrganizerPaidOrdersTableClient from "@/components/OrganizerPaidOrdersTableClient";
import { getOrganizerSession } from "@/lib/auth";
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
  const session = await getOrganizerSession();

  if (!session) {
    redirect("/organisateur/connexion");
  }

  const { slug } = await params;
  const storage = ticketingStorage();

  const organizer = await storage.getTicketingOrganizerAccountById(
    session.organizerId
  );

  if (!organizer || organizer.status !== "active") {
    redirect("/organisateur/connexion");
  }

  const event = await storage.getTicketingEventBySlug(slug);

  if (!event || event.ownerOrganizerId !== organizer.id) {
    notFound();
  }

  const allOrders = await storage.getTicketingOrders(event.id);
  const orders = allOrders.filter((order) => order.paymentStatus === "paid");

  const totalParticipants = orders.reduce(
    (sum, order) => sum + order.participants.length,
    0
  );

  const totalEventAmount = orders.reduce(
    (sum, order) => sum + order.subtotalAmount,
    0
  );

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
            href={`/organisateur/billetteries/${event.slug}`}
            className="button secondary"
          >
            Retour à la billetterie
          </Link>

          <Link href="/organisateur/billetteries" className="button secondary">
            Mes billetteries
          </Link>
        </div>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#64748b",
              fontSize: "14px",
              fontWeight: 800,
            }}
          >
            Inscriptions organisateur
          </p>

          <h1 style={{ margin: 0 }}>{event.title}</h1>

          <p style={{ color: "#64748b", marginBottom: 0, lineHeight: 1.6 }}>
            Liste des inscriptions payées pour cette billetterie.
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
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
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
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
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
            <strong>Montant événement</strong>
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
              {formatAmount(totalEventAmount)}
            </div>
          </div>
        </section>

        <OrganizerPaidOrdersTableClient
          eventId={event.id}
          eventSlug={event.slug}
          orders={orders}
        />
      </div>
    </main>
  );
}