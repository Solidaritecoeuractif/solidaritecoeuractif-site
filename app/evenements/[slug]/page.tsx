import { notFound } from "next/navigation";
import { ticketingStorage } from "@/lib/ticketing";

function formatDate(value?: string) {
  if (!value) return null;

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

function durationLabel(value: string) {
  if (value === "one_day") return "Sur une journée";
  if (value === "several_days") return "Sur plusieurs jours";
  return "Durée à préciser";
}

function ratePriceLabel(rate: {
  type: string;
  amount?: number;
  minimumAmount?: number;
}) {
  if (rate.type === "free") return "Gratuit";

  if (rate.type === "free_amount") {
    return `À partir de ${formatAmount(rate.minimumAmount)}`;
  }

  return formatAmount(rate.amount);
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const storage = ticketingStorage();
  const event = await storage.getTicketingEventBySlug(slug);

  if (!event || !event.isVisible || event.status !== "published") {
    notFound();
  }

  const rates = await storage.getTicketingRates(event.id);
  const activeRates = rates.filter((rate) => rate.isActive);

  const startsAt = formatDate(event.startsAt);
  const endsAt = formatDate(event.endsAt);

  return (
    <main
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "36px 18px 56px",
        display: "grid",
        gap: "22px",
      }}
    >
      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "22px",
          padding: "28px",
          background:
            "linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 60%)",
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            color: "#64748b",
            fontWeight: 700,
            fontSize: "14px",
          }}
        >
          Billetterie
        </p>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(32px, 5vw, 54px)",
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
          }}
        >
          {event.title}
        </h1>

        {event.formTypeLabel ? (
          <p
            style={{
              margin: "14px 0 0",
              color: "#475569",
              fontSize: "17px",
              fontWeight: 600,
            }}
          >
            {event.formTypeLabel}
          </p>
        ) : null}

        {event.shortDescription ? (
          <p
            style={{
              margin: "22px 0 0",
              color: "#334155",
              fontSize: "17px",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              maxWidth: "820px",
            }}
          >
            {event.shortDescription}
          </p>
        ) : null}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>Lieu</h2>
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
            {[event.locationName, event.addressLine, event.postalCode, event.city, event.country]
              .filter(Boolean)
              .join(", ") || "Lieu à préciser"}
          </p>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>Date</h2>
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
            {startsAt && endsAt
              ? `${startsAt} → ${endsAt}`
              : startsAt
                ? startsAt
                : durationLabel(event.durationType)}
          </p>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>Contact</h2>
          <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
            {event.organizerEmail ? (
              <>
                Email :{" "}
                <a href={`mailto:${event.organizerEmail}`}>
                  {event.organizerEmail}
                </a>
              </>
            ) : (
              "Contact à préciser"
            )}
            {event.organizerPhone ? (
              <>
                <br />
                Téléphone : {event.organizerPhone}
              </>
            ) : null}
          </p>
        </div>
      </section>

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "22px",
          padding: "24px",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "end",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                color: "#64748b",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              Tarifs disponibles
            </p>
            <h2 style={{ margin: 0, fontSize: "28px" }}>Choisir un billet</h2>
          </div>

          <span
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "999px",
              padding: "8px 12px",
              color: "#64748b",
              fontSize: "13px",
              fontWeight: 700,
              background: "#f8fafc",
            }}
          >
            Lecture seule pour le moment
          </span>
        </div>

        {activeRates.length === 0 ? (
          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Aucun tarif actif n’est disponible pour le moment.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {activeRates.map((rate) => (
              <article
                key={rate.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: "18px",
                  padding: "18px",
                  background: "#f8fafc",
                  display: "grid",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    alignItems: "start",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "20px" }}>
                      {rate.name}
                    </h3>
                    {rate.description ? (
                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "#475569",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {rate.description}
                      </p>
                    ) : null}
                  </div>

                  <strong
                    style={{
                      fontSize: "20px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ratePriceLabel(rate)}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  {rate.totalQuantityLimit ? (
                    <span>Places limitées : {rate.totalQuantityLimit}</span>
                  ) : null}

                  {rate.quantityPerOrderLimit ? (
                    <span>
                      Limite par commande : {rate.quantityPerOrderLimit}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {event.allowExtraDonation ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "18px",
            padding: "18px",
            background: "#f8fafc",
            color: "#334155",
            lineHeight: 1.6,
          }}
        >
          <strong>Contribution libre</strong>
          <br />
          Une contribution libre pourra être proposée lors de l’ouverture du
          module d’inscription.
        </section>
      ) : null}

      <section
        style={{
          border: "1px solid #facc15",
          borderRadius: "18px",
          padding: "16px",
          background: "#fffbeb",
          color: "#92400e",
          fontWeight: 700,
        }}
      >
        Cette page publique est en lecture seule pour le moment. L’inscription
        et le paiement seront ajoutés dans une étape suivante.
      </section>
    </main>
  );
}