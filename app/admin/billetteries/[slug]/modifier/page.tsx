import Link from "next/link";
import { notFound } from "next/navigation";
import TicketingEditClient from "@/components/TicketingEditClient";
import TicketingFieldsEditorClient from "@/components/TicketingFieldsEditorClient";
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
          <Link href={`/admin/billetteries/${event.slug}`} className="button secondary">
            Retour au détail
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
            Modification billetterie
          </p>

          <h1 style={{ margin: 0 }}>{event.title}</h1>

          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Modification des informations générales, des tarifs et des
            informations complémentaires. Les paiements, commandes classiques,
            offres, panier, Stripe et exports existants ne sont pas modifiés.
          </p>
        </section>

        <TicketingEditClient event={event} rates={rates} />

        <TicketingFieldsEditorClient event={event} fields={customFields} />
      </div>
    </main>
  );
}