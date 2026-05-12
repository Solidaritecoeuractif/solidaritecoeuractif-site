import { notFound } from "next/navigation";
import PublicTicketingSelectionClient from "@/components/PublicTicketingSelectionClient";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return "—";

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount / 100);
}

function rateTypeLabel(type: string) {
  if (type === "fixed") return "Prix fixe";
  if (type === "free_amount") return "Prix libre";
  if (type === "free") return "Gratuit";
  return type;
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    preview?: string;
    paiement?: string;
    reference?: string;
  }>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const previewRequested = query.preview === "organizer";
  const paymentSucceeded = query.paiement === "success";
  const paymentReference = String(query.reference || "").trim();

  const storage = ticketingStorage();
  const event = await storage.getTicketingEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const isPublic = event.isVisible && event.status === "published";

  let canPreviewAsOrganizer = false;

  if (!isPublic && previewRequested) {
    const session = await getOrganizerSession();

    if (session) {
      const organizer = await storage.getTicketingOrganizerAccountById(
        session.organizerId
      );

      canPreviewAsOrganizer =
        Boolean(organizer) &&
        organizer?.status === "active" &&
        event.ownerOrganizerId === organizer.id;
    }
  }

  if (!isPublic && !canPreviewAsOrganizer) {
    notFound();
  }

  const [rates, customFields] = await Promise.all([
    storage.getTicketingRates(event.id),
    storage.getTicketingCustomFields(event.id),
  ]);

  const activeRates = rates.filter((rate) => rate.isActive);
  const activeParticipantFields = customFields.filter(
    (field) => field.isActive && field.target === "participant"
  );

  const startsAt = formatDate(event.startsAt);
  const endsAt = formatDate(event.endsAt);

  const isOrganizerPreview = previewRequested && canPreviewAsOrganizer;
  const readOnlyPreview = isOrganizerPreview && !isPublic;
  const eventImageUrl = event.bannerImageUrl || event.thumbnailImageUrl || "";

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
      {paymentSucceeded ? (
        <section
          style={{
            border: "1px solid #bbf7d0",
            borderRadius: "22px",
            padding: "22px",
            background: "#f0fdf4",
            color: "#14532d",
            display: "grid",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              background: "#dcfce7",
              color: "#166534",
              fontWeight: 900,
              fontSize: "22px",
            }}
          >
            ✓
          </div>

          <div>
            <h2 style={{ margin: 0, fontSize: "28px" }}>
              Inscription confirmée
            </h2>

            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
              Votre paiement a bien été reçu et votre inscription à{" "}
              <strong>{event.title}</strong> est enregistrée.
            </p>

            {paymentReference ? (
              <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
                Référence de l’inscription :{" "}
                <strong>{paymentReference}</strong>
              </p>
            ) : null}

            <p style={{ margin: "8px 0 0", lineHeight: 1.6 }}>
              Un email de confirmation vient de vous être envoyé. Pensez à
              vérifier aussi vos courriers indésirables si vous ne le voyez pas
              dans votre boîte principale.
            </p>
          </div>
        </section>
      ) : null}

      {isOrganizerPreview ? (
        <section
          style={{
            border: "1px solid #fde68a",
            borderRadius: "18px",
            padding: "14px 16px",
            background: "#fffbeb",
            color: "#92400e",
            fontWeight: 800,
            lineHeight: 1.5,
          }}
        >
          Aperçu organisateur : cette page permet de vérifier le rendu public
          avant publication.{" "}
          {readOnlyPreview
            ? "La billetterie n’est pas encore publiée, donc l’inscription est désactivée dans cet aperçu."
            : "La billetterie est déjà publiée."}
        </section>
      ) : null}

      <section
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "22px",
          padding: "28px",
          background:
            "linear-gradient(135deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 60%)",
          display: "grid",
          gridTemplateColumns: eventImageUrl
            ? "minmax(0, 1.4fr) minmax(240px, 0.6fr)"
            : "1fr",
          gap: "24px",
          alignItems: "center",
        }}
      >
        <div>
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
        </div>

        {eventImageUrl ? (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "20px",
              padding: "14px",
              background: "#ffffff",
              display: "grid",
              placeItems: "center",
              minHeight: "180px",
              overflow: "hidden",
            }}
          >
            <img
              src={eventImageUrl}
              alt={`Image de la billetterie ${event.title}`}
              style={{
                width: "100%",
                maxHeight: "260px",
                objectFit: "contain",
                borderRadius: "16px",
              }}
            />
          </div>
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

      {readOnlyPreview ? (
        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "22px",
            padding: "22px",
            background: "#ffffff",
            display: "grid",
            gap: "14px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Tarifs disponibles</h2>
            <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 }}>
              Aperçu en lecture seule. Publie la billetterie pour activer les
              inscriptions.
            </p>
          </div>

          {activeRates.length === 0 ? (
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Aucun tarif actif pour le moment.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {activeRates.map((rate) => (
                <article
                  key={rate.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "#f8fafc",
                  }}
                >
                  <strong>{rate.name}</strong>

                  {rate.description ? (
                    <p
                      style={{
                        margin: "8px 0 0",
                        color: "#64748b",
                        lineHeight: 1.5,
                      }}
                    >
                      {rate.description}
                    </p>
                  ) : null}

                  <p style={{ margin: "10px 0 0", color: "#334155" }}>
                    {rateTypeLabel(rate.type)} —{" "}
                    <strong>
                      {rate.type === "fixed"
                        ? formatAmount(rate.amount)
                        : rate.type === "free_amount"
                          ? `Dès ${formatAmount(rate.minimumAmount)}`
                          : "Gratuit"}
                    </strong>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <PublicTicketingSelectionClient
          event={event}
          rates={activeRates}
          customFields={activeParticipantFields}
        />
      )}
    </main>
  );
}