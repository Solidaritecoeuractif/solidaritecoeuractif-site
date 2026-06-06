import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OrganizerTicketingPublicationActions from "@/components/OrganizerTicketingPublicationActions";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

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

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return "—";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
}

function statusLabel(status: string, isVisible: boolean) {
  if (status === "published" && isVisible) return "Visible publiquement";
  if (status === "hidden") return "Masquée";
  if (status === "archived") return "Archivée";
  return "Brouillon";
}

function durationLabel(value: string) {
  if (value === "one_day") return "Sur une journée";
  if (value === "several_days") return "Sur plusieurs jours";
  return "Sans durée définie";
}

function rateTypeLabel(type: string) {
  if (type === "fixed") return "Prix fixe";
  if (type === "free_amount") return "Prix libre";
  if (type === "free") return "Gratuit";
  return type;
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

  const [rates, orders] = await Promise.all([
    storage.getTicketingRates(event.id),
    storage.getTicketingOrders(event.id),
  ]);

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");

  const paidParticipantsCount = paidOrders.reduce(
    (sum, order) => sum + order.participants.length,
    0
  );

  const eventAmount = paidOrders.reduce(
    (sum, order) => sum + order.subtotalAmount,
    0
  );

  const publicVisible = event.status === "published" && event.isVisible;

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
          <Link href="/organisateur/billetteries" className="button secondary">
            Retour
          </Link>

          <Link
            href={`/organisateur/billetteries/${event.slug}/modifier`}
            className="button"
          >
            Modifier
          </Link>

          <Link
            href={`/organisateur/billetteries/${event.slug}/inscriptions`}
            className="button secondary"
          >
            Inscriptions
          </Link>

          {publicVisible ? (
            <Link
              href={`/evenements/${event.slug}`}
              target="_blank"
              className="button secondary"
            >
              Voir la page publique
            </Link>
          ) : null}
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
            Billetterie organisateur
          </p>

          <h1 style={{ margin: 0 }}>{event.title}</h1>

          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
            Cette page affiche les informations de ta billetterie. La
            contribution Solidarité Cœur Actif reste gérée uniquement par
            l’admin général.
          </p>
        </section>

        <OrganizerTicketingPublicationActions event={event} />

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
            <div style={{ marginTop: "6px" }}>
              {statusLabel(event.status, event.isVisible)}
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
            <strong>Inscriptions payées</strong>
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
              {paidOrders.length}
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
            <strong>Participants payés</strong>
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
              {paidParticipantsCount}
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
            <strong>Montant événement payé</strong>
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
              {formatAmount(eventAmount)}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Informations générales</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Type de formulaire</strong>
              <br />
              {event.formTypeLabel || "—"}
            </div>

            <div>
              <strong>Durée</strong>
              <br />
              {durationLabel(event.durationType)}
            </div>

            <div>
              <strong>Début</strong>
              <br />
              {formatDate(event.startsAt)}
            </div>

            <div>
              <strong>Fin</strong>
              <br />
              {formatDate(event.endsAt)}
            </div>

            <div>
              <strong>Lieu</strong>
              <br />
              {event.locationName || "—"}
            </div>

            <div>
              <strong>Adresse</strong>
              <br />
              {[event.addressLine, event.postalCode, event.city, event.country]
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
          </div>

          <div style={{ marginTop: "16px" }}>
            <strong>Description courte</strong>
            <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
              {event.shortDescription || "—"}
            </p>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Tarifs</h2>

          {rates.length === 0 ? (
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Aucun tarif enregistré.
            </p>
          ) : (
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
                    <th style={{ width: "240px" }}>Nom</th>
                    <th style={{ width: "140px" }}>Type</th>
                    <th style={{ width: "140px" }}>Montant</th>
                    <th style={{ width: "140px" }}>Limite totale</th>
                    <th style={{ width: "160px" }}>Limite / commande</th>
                    <th style={{ width: "120px" }}>Statut</th>
                  </tr>
                </thead>

                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id}>
                      <td>
                        <strong>{rate.name}</strong>
                        {rate.description ? (
                          <>
                            <br />
                            <small>{rate.description}</small>
                          </>
                        ) : null}
                      </td>

                      <td>{rateTypeLabel(rate.type)}</td>

                      <td>
                        {rate.type === "fixed"
                          ? formatAmount(rate.amount)
                          : rate.type === "free_amount"
                            ? `Dès ${formatAmount(rate.minimumAmount)}`
                            : "0 €"}
                      </td>

                      <td>{rate.totalQuantityLimit ?? "—"}</td>
                      <td>{rate.quantityPerOrderLimit ?? "—"}</td>
                      <td>{rate.isActive ? "Actif" : "Désactivé"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Contact</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Email organisateur</strong>
              <br />
              {event.organizerEmail || "—"}
            </div>

            <div>
              <strong>Téléphone organisateur</strong>
              <br />
              {event.organizerPhone || "—"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}