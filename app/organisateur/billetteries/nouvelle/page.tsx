import { redirect } from "next/navigation";
import OrganizerNewTicketingClient from "@/components/OrganizerNewTicketingClient";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

export default async function Page() {
  const session = await getOrganizerSession();

  if (!session) {
    redirect("/organisateur/connexion");
  }

  const organizer = await ticketingStorage().getTicketingOrganizerAccountById(
    session.organizerId
  );

  if (!organizer || organizer.status !== "active") {
    redirect("/organisateur/connexion");
  }

  if (!organizer.canCreateEvents) {
    return (
      <main className="panel">
        <section
          style={{
            border: "1px solid #fecaca",
            borderRadius: "18px",
            padding: "18px",
            background: "#fef2f2",
            color: "#991b1b",
            fontWeight: 800,
          }}
        >
          Ce compte organisateur n’est pas autorisé à créer des billetteries.
        </section>
      </main>
    );
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

          <h1 style={{ margin: 0 }}>Nouvelle billetterie</h1>

          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
            Crée une billetterie en brouillon. Tu pourras ensuite compléter les
            paramètres, les tarifs et les informations demandées aux participants.
          </p>
        </section>

        <OrganizerNewTicketingClient organizerEmail={organizer.email} />
      </div>
    </main>
  );
}