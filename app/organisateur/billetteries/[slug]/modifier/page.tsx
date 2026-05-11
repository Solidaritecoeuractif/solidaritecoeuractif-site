import { notFound, redirect } from "next/navigation";
import OrganizerEditTicketingClient from "@/components/OrganizerEditTicketingClient";
import OrganizerFieldsEditorClient from "@/components/OrganizerFieldsEditorClient";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

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
            Espace organisateur
          </p>

          <h1 style={{ margin: 0 }}>Modifier la billetterie</h1>

          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
            Modifie les informations de ta billetterie, ses tarifs et les
            informations demandées aux participants. Les paramètres de
            contribution Solidarité Cœur Actif restent réservés à l’admin
            général.
          </p>
        </section>

        <OrganizerEditTicketingClient
          event={event}
          rates={rates}
          extraSection={
            <OrganizerFieldsEditorClient event={event} fields={customFields} />
          }
        />
      </div>
    </main>
  );
}