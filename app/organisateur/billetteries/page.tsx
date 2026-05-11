import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

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

export default async function Page() {
  const session = await getOrganizerSession();

  if (!session) {
    redirect("/organisateur/connexion");
  }

  const storage = ticketingStorage();
  const organizer = await storage.getTicketingOrganizerAccountById(
    session.organizerId
  );

  if (!organizer || organizer.status !== "active") {
    redirect("/organisateur/connexion");
  }

  const allEvents = await storage.getTicketingEvents();
  const events = allEvents.filter(
    (event) => event.ownerOrganizerId === organizer.id
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

          <h1 style={{ margin: 0 }}>
            Bonjour {organizer.displayName || organizer.email}
          </h1>

          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
            Retrouve ici les billetteries rattachées à ton compte organisateur.
          </p>
        </section>

        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#f8fafc",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Mes billetteries</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              {events.length} billetterie(s) rattachée(s) à ce compte.
            </p>
          </div>

          <button type="button" className="button" disabled>
            Créer une billetterie bientôt
          </button>
        </section>

        {events.length === 0 ? (
          <section
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "18px",
              padding: "22px",
              background: "#ffffff",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Aucune billetterie pour le moment</h2>

            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              La création de billetterie depuis l’espace organisateur sera
              ajoutée à l’étape suivante.
            </p>
          </section>
        ) : (
          <section
            style={{
              border: "1px solid #dbe3ee",
              borderRadius: "18px",
              padding: "18px",
              background: "#ffffff",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                className="table"
                style={{
                  width: "100%",
                  minWidth: "760px",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: "260px" }}>Billetterie</th>
                    <th style={{ width: "160px" }}>Statut</th>
                    <th style={{ width: "180px" }}>Créée le</th>
                    <th style={{ width: "180px" }}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.title}</strong>
                        <br />
                        <small style={{ color: "#64748b" }}>
                          /evenements/{event.slug}
                        </small>
                      </td>

                      <td>{event.status}</td>

                      <td>{formatDate(event.createdAt)}</td>

                      <td>
                        <Link
                          href={`/admin/billetteries/${event.slug}`}
                          className="button secondary small"
                          style={{ textDecoration: "none" }}
                        >
                          Ouvrir bientôt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <form action="/api/organisateur/deconnexion" method="post">
          <button type="submit" className="button secondary">
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}