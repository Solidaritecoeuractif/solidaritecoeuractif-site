import Link from "next/link";
import { notFound } from "next/navigation";
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

function paymentStatusStyle(status: string) {
  if (status === "paid") {
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #bbf7d0",
    };
  }

  if (status === "cancelled") {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      border: "1px solid #fecaca",
    };
  }

  return {
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
  };
}

function answerValue(value: unknown) {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  if (value === null || typeof value === "undefined") return "—";

  const text = String(value).trim();
  return text || "—";
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;

  const storage = ticketingStorage();

  const event = await storage.getTicketingEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const order = await storage.getTicketingOrderByReference(reference);

  if (!order || order.eventId !== event.id) {
    notFound();
  }

  const [rates, customFields] = await Promise.all([
    storage.getTicketingRates(event.id),
    storage.getTicketingCustomFields(event.id),
  ]);

  const activeParticipantFields = customFields.filter(
    (field) => field.isActive && field.target === "participant"
  );

  const rateNameById = new Map(
    rates.map((rate) => [rate.id, rate.name || "Tarif sans nom"])
  );

  function getRateName(rateId: string) {
    return rateNameById.get(rateId) || "Tarif introuvable";
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
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            href={`/admin/billetteries/${event.slug}/inscriptions`}
            className="button secondary"
          >
            Retour aux inscriptions
          </Link>

          <Link
            href={`/admin/billetteries/${event.slug}`}
            className="button secondary"
          >
            Retour à la billetterie
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
            Détail inscription billetterie
          </p>

          <h1 style={{ margin: 0 }}>{order.reference}</h1>

          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Cette inscription appartient à la billetterie :{" "}
            <strong>{event.title}</strong>.
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
            <div style={{ marginTop: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  padding: "7px 12px",
                  fontSize: "13px",
                  fontWeight: 800,
                  ...paymentStatusStyle(order.paymentStatus),
                }}
              >
                {paymentStatusLabel(order.paymentStatus)}
              </span>
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
            <strong>Total</strong>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>
              {formatAmount(order.totalAmount)}
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
            <strong>Créée le</strong>
            <div style={{ marginTop: "6px" }}>{formatDate(order.createdAt)}</div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "16px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Payeur</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Nom complet</strong>
              <br />
              {order.payerFirstName} {order.payerLastName}
            </div>

            <div>
              <strong>Email</strong>
              <br />
              <a href={`mailto:${order.payerEmail}`}>{order.payerEmail}</a>
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
            borderRadius: "16px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Montants</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong>Sous-total billets</strong>
              <br />
              {formatAmount(order.subtotalAmount)}
            </div>

            <div>
              <strong>Contribution libre</strong>
              <br />
              {formatAmount(order.extraDonationAmount)}
            </div>

            <div>
              <strong>Total</strong>
              <br />
              <span style={{ fontWeight: 800 }}>
                {formatAmount(order.totalAmount)}
              </span>
            </div>

            <div>
              <strong>Devise</strong>
              <br />
              {order.currency.toUpperCase()}
            </div>
          </div>
        </section>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "16px",
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
              {order.participants.map((participant, index) => (
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
                      <strong>
                        Participant {index + 1} — {participant.firstName}{" "}
                        {participant.lastName}
                      </strong>
                      <br />
                      <small style={{ color: "#64748b" }}>
                        Tarif : {getRateName(participant.rateId)}
                      </small>
                    </div>

                    <small style={{ color: "#64748b" }}>
                      ID tarif : {participant.rateId}
                    </small>
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
                      {participant.firstName}
                    </div>

                    <div>
                      <strong>Nom</strong>
                      <br />
                      {participant.lastName}
                    </div>

                    <div>
                      <strong>Âge</strong>
                      <br />
                      {answerValue(participant.answers?.age)}
                    </div>

                    <div>
                      <strong>Email</strong>
                      <br />
                      {participant.answers?.email ? (
                        <a href={`mailto:${String(participant.answers.email)}`}>
                          {String(participant.answers.email)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </div>

                    <div>
                      <strong>Téléphone</strong>
                      <br />
                      {answerValue(participant.answers?.phone)}
                    </div>

                    <div>
                      <strong>Ville d’origine</strong>
                      <br />
                      {answerValue(participant.answers?.origin_city)}
                    </div>
                  </div>

                  {activeParticipantFields.length > 0 ? (
                    <div
                      style={{
                        borderTop: "1px solid #e5e7eb",
                        paddingTop: "12px",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <strong>Informations complémentaires</strong>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(190px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {activeParticipantFields.map((field) => (
                          <div key={field.id}>
                            <strong>
                              {field.label}
                              {field.isRequired ? " *" : ""}
                            </strong>
                            <br />
                            {answerValue(
                              participant.answers?.[field.fieldKey]
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
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
            fontWeight: 600,
          }}
        >
          Cette page affiche les informations détaillées des participants
          uniquement pour les inscriptions billetterie. Les commandes classiques,
          offres, panier, Stripe et exports existants ne sont pas modifiés.
        </section>
      </div>
    </main>
  );
}