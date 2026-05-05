import Link from "next/link";
import { notFound } from "next/navigation";
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

function durationLabel(value: string) {
  if (value === "one_day") return "Sur une journée";
  if (value === "several_days") return "Sur plusieurs jours";
  return "Sans durée définie";
}

function statusLabel(status: string, isVisible: boolean) {
  if (status === "published" && isVisible) return "Visible publiquement";
  if (status === "hidden") return "Masquée";
  if (status === "archived") return "Archivée";
  return "Brouillon";
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
  const { slug } = await params;

  const storage = ticketingStorage();
  const event = await storage.getTicketingEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const rates = await storage.getTicketingRates(event.id);

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
          <Link href="/admin/billetteries" className="button secondary">
            Retour aux billetteries
          </Link>

          <Link
            href={`/admin/billetteries/${event.slug}/modifier`}
            className="button"
          >
            Modifier
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
            Détail billetterie
          </p>

          <h1 style={{ margin: 0 }}>{event.title}</h1>

          <p style={{ color: "#64748b", marginBottom: 0 }}>
            Cette page affiche les paramètres enregistrés de la billetterie.
          </p>
        </section>

        <section
          style={{
            border: "1px solid #dbe3ee",
            borderRadius: "16px",
            padding: "18px",
            background: "#f8fafc",
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
              <strong>Statut</strong>
              <br />
              {statusLabel(event.status, event.isVisible)}
            </div>

            <div>
              <strong>Slug</strong>
              <br />
              {event.slug}
            </div>

            <div>
              <strong>Type de formulaire</strong>
              <br />
              {event.formTypeLabel || "—"}
            </div>

            <div>
              <strong>Lien public prévu</strong>
              <br />
              {event.isVisible ? (
                <span style={{ color: "#166534", fontWeight: 700 }}>
                  /evenements/{event.slug}
                </span>
              ) : (
                <span style={{ color: "#64748b" }}>Non publié</span>
              )}
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
          <h2 style={{ marginTop: 0 }}>Lieu et durée</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
            }}
          >
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
          <h2 style={{ marginTop: 0 }}>Tarifs</h2>

          {rates.length === 0 ? (
            <p style={{ color: "#64748b", marginBottom: 0 }}>
              Aucun tarif enregistré pour cette billetterie.
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
                    <th style={{ width: "220px" }}>Nom</th>
                    <th style={{ width: "130px" }}>Type</th>
                    <th style={{ width: "130px" }}>Montant</th>
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
            borderRadius: "16px",
            padding: "18px",
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Contact et description</h2>

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

            <div>
              <strong>Contribution libre</strong>
              <br />
              {event.allowExtraDonation ? "Activée" : "Désactivée"}
            </div>

            <div>
              <strong>Montants proposés</strong>
              <br />
              {event.suggestedDonationAmounts.length > 0
                ? event.suggestedDonationAmounts
                    .map((amount) => formatAmount(amount))
                    .join(", ")
                : "—"}
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
            border: "1px solid #facc15",
            borderRadius: "16px",
            padding: "14px",
            background: "#fffbeb",
            color: "#92400e",
            fontWeight: 600,
          }}
        >
          Le bouton Modifier agit uniquement sur les informations générales de
          cette billetterie. Les commandes, offres, panier, Stripe et exports
          existants ne sont pas modifiés.
        </section>
      </div>
    </main>
  );
}