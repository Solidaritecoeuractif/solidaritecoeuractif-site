import { notFound } from "next/navigation";
import PublicTicketingSelectionClient from "@/components/PublicTicketingSelectionClient";
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

function durationLabel(value: string) {
  if (value === "one_day") return "Sur une journée";
  if (value === "several_days") return "Sur plusieurs jours";
  return "Durée à préciser";
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
            {[
              event.locationName,
              event.addressLine,
              event.postalCode,
              event.city,
              event.country,
            ]
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

      <PublicTicketingSelectionClient event={event} rates={activeRates} />
    </main>
  );
}