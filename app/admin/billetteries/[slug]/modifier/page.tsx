import Link from "next/link";
import { notFound } from "next/navigation";
import TicketingEditClient from "@/components/TicketingEditClient";
import { ticketingStorage } from "@/lib/ticketing";

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

  const [rates, customFields] = await Promise.all([
    storage.getTicketingRates(event.id),
    storage.getTicketingCustomFields(event.id),
  ]);

  return (
    <main className="panel">
      <div
        style={{
          display: "grid",
          gap: "18px",
          maxWidth: "1180px",
        }}
      >
        <div>
          <Link
            href={`/admin/billetteries/${event.slug}`}
            className="button secondary"
          >
            Retour au détail
          </Link>
        </div>

        <section
          style={{
            border: "1px solid #bfdbfe",
            borderRadius: "18px",
            padding: "20px",
            background:
              "linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f8fafc 100%)",
            boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#2563eb",
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Modification billetterie
          </p>

          <h1 style={{ margin: 0, color: "#0f172a" }}>{event.title}</h1>

          <p style={{ color: "#64748b", marginBottom: 0, lineHeight: 1.6 }}>
            Modification des informations générales, du lieu, des tarifs, des
            informations complémentaires, de l’email de confirmation et des
            paramètres de contact. Les paiements, commandes classiques, offres,
            panier, Stripe et exports existants ne sont pas modifiés.
          </p>
        </section>

        <TicketingEditClient
          event={event}
          rates={rates}
          fields={customFields}
        />
      </div>
    </main>
  );
}