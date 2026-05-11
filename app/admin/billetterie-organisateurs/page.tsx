import Link from "next/link";
import TicketingPlatformOrganizersClient from "@/components/TicketingPlatformOrganizersClient";
import { ticketingStorage } from "@/lib/ticketing";

export default async function Page() {
  const organizers = await ticketingStorage().getTicketingOrganizerAccounts();

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
          <Link href="/admin" className="button secondary">
            Retour admin
          </Link>

          <Link href="/admin/billetteries" className="button secondary">
            Billetteries
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
              fontWeight: 700,
            }}
          >
            Plateforme billetterie
          </p>

          <h1 style={{ margin: 0 }}>Organisateurs de la plateforme</h1>

          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
            Cette page permet de créer et gérer les organisateurs qui pourront
            utiliser l’espace organisateur pour créer leurs propres
            billetteries. La contribution Solidarité Cœur Actif reste pilotée
            uniquement depuis l’admin général.
          </p>
        </section>

        <TicketingPlatformOrganizersClient initialOrganizers={organizers} />
      </div>
    </main>
  );
}