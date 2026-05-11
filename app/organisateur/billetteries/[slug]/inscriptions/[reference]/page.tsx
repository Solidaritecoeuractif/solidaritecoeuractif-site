import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganizerSession } from "@/lib/auth";
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

function answerValue(answers: Record<string, unknown>, key: string) {
  const value = answers?.[key];

  if (value === true) return "Oui";
  if (value === false) return "Non";
  if (value === null || typeof value === "undefined") return "—";

  return String(value);
}

function formatComplementaryValue(value: unknown) {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  if (value === null || typeof value === "undefined" || value === "") return "—";

  return String(value);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const session = await getOrganizerSession();

  if (!session) {
    redirect("/organisateur/connexion");
  }

  const { slug, reference } = await params;
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

  const order = await storage.getTicketingOrderByReference(reference);

  if (!order || order.eventId !== event.id || order.paymentStatus !== "paid") {
    notFound();
  }

  const [rates, customFields] = await Promise.all([
    storage.getTicketingRates(event.id),
    storage.getTicketingCustomFields(event.id),
  ]);

  const rateById = new Map(rates.map((rate) => [rate.id, rate.name]));

  const activeCustomFields = customFields
    .filter((field) => field.isActive)
    .sort((a, b) => a.position - b.position);

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
            href={`/organisateur/billetteries/${event.slug}/inscriptions`}
            className="button secondary"
          >
            Retour aux inscriptions
          </Link>

          <Link
            href={`/organisateur/billetteries/${event.slug}`}
            className="button secondary"
          >
            Retour à la billetterie
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
            Détail inscription
          </p>

          <h1 style={{ margin: 0 }}>{order.reference}</h1>

          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 0 }}>
            Inscription payée pour la billetterie : <strong>{event.title}</strong>.
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
            <div style={{ marginTop: "6px" }}>
              {paymentStatusLabel(order.paymentStatus)}
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
            <strong>Montant événement</strong>
            <div style={{ fontSize: "28px", fontWeight: 900, marginTop: "6px" }}>
              {formatAmount(order.subtotalAmount)}
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
            <strong>Date</strong>
            <div style={{ marginTop: "6px" }}>{formatDate(order.createdAt)}</div>
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
          <h2 style={{ marginTop: 0 }}>Contact principal</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Prénom</strong>
              <br />
              {order.payerFirstName || "—"}
            </div>

            <div>
              <strong>Nom</strong>
              <br />
              {order.payerLastName || "—"}
            </div>

            <div>
              <strong>Email</strong>
              <br />
              {order.payerEmail || "—"}
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
            borderRadius: "18px",
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
            <div style={{ display: "grid", gap: "14px" }}>
              {order.participants.map((participant, index) => {
                const answers = participant.answers || {};

                return (
                  <article
                    key={participant.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "16px",
                      padding: "16px",
                      background: "#f8fafc",
                      display: "grid",
                      gap: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "18px" }}>
                          Participant {index + 1}
                        </strong>
                        <div style={{ color: "#64748b", marginTop: "4px" }}>
                          {rateById.get(participant.rateId) || "Tarif non trouvé"}
                        </div>
                      </div>

                      <strong>
                        {participant.firstName} {participant.lastName}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(190px, 1fr))",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <strong>Prénom</strong>
                        <br />
                        {participant.firstName || "—"}
                      </div>

                      <div>
                        <strong>Nom</strong>
                        <br />
                        {participant.lastName || "—"}
                      </div>

                      <div>
                        <strong>Âge</strong>
                        <br />
                        {answerValue(answers, "age")}
                      </div>

                      <div>
                        <strong>Email</strong>
                        <br />
                        {answerValue(answers, "email")}
                      </div>

                      <div>
                        <strong>Téléphone</strong>
                        <br />
                        {answerValue(answers, "phone")}
                      </div>

                      <div>
                        <strong>Ville d’origine</strong>
                        <br />
                        {answerValue(answers, "origin_city")}
                      </div>
                    </div>

                    {activeCustomFields.length > 0 ? (
                      <div
                        style={{
                          borderTop: "1px solid #e5e7eb",
                          paddingTop: "12px",
                        }}
                      >
                        <strong>Informations complémentaires</strong>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(190px, 1fr))",
                            gap: "12px",
                            marginTop: "10px",
                          }}
                        >
                          {activeCustomFields.map((field) => (
                            <div key={field.id}>
                              <strong>{field.label}</strong>
                              <br />
                              {formatComplementaryValue(
                                answers[field.fieldKey]
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
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
            fontWeight: 700,
          }}
        >
          Cette page affiche uniquement le montant événement. Les contributions
          facultatives à Solidarité Cœur Actif ne sont pas affichées dans
          l’espace organisateur.
        </section>
      </div>
    </main>
  );
}