import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toISOString();
  } catch {
    return value;
  }
}

function statusLabel(value: string) {
  if (value === "paid") return "Payée";
  if (value === "cancelled") return "Annulée";
  return "En attente";
}

function answerValue(answers: Record<string, unknown>, key: string) {
  return answers?.[key] ?? "";
}

function amountToEurosText(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "0,00";
  }

  return (value / 100).toFixed(2).replace(".", ",");
}

function parseReferencesFromRequest(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("references");

  if (!raw) return null;

  const references = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (references.length === 0) return null;

  return new Set(references);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const storage = ticketingStorage();
    const event = await storage.getTicketingEventById(id);

    if (!event) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 404 }
      );
    }

    const selectedReferences = parseReferencesFromRequest(request);

    const [allOrders, rates] = await Promise.all([
      storage.getTicketingOrders(event.id),
      storage.getTicketingRates(event.id),
    ]);

    const paidOrders = allOrders.filter(
      (order) => order.paymentStatus === "paid"
    );

    const orders = selectedReferences
      ? paidOrders.filter((order) => selectedReferences.has(order.reference))
      : paidOrders;

    const rateById = new Map(rates.map((rate) => [rate.id, rate.name]));

    const headers = [
      "evenement",
      "reference",
      "statut",
      "date_creation",
      "date_mise_a_jour",
      "contact_prenom",
      "contact_nom",
      "contact_email",
      "contact_telephone",
      "nombre_participants",
      "sous_total_euros",
      "contribution_euros",
      "total_euros",
      "devise",
      "stripe_session_id",
      "stripe_payment_intent_id",
      "participant_numero",
      "participant_prenom",
      "participant_nom",
      "participant_age",
      "participant_email",
      "participant_telephone",
      "participant_ville_origine",
      "participant_tarif",
      "reponses_complementaires",
    ];

    const rows = orders.flatMap((order) => {
      if (order.participants.length === 0) {
        return [
          [
            event.title,
            order.reference,
            statusLabel(order.paymentStatus),
            formatDate(order.createdAt),
            formatDate(order.updatedAt),
            order.payerFirstName,
            order.payerLastName,
            order.payerEmail,
            order.payerPhone || "",
            order.participants.length,
            amountToEurosText(order.subtotalAmount),
            amountToEurosText(order.extraDonationAmount),
            amountToEurosText(order.totalAmount),
            order.currency,
            order.stripeSessionId || "",
            order.stripePaymentIntentId || "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
          ],
        ];
      }

      return order.participants.map((participant, index) => {
        const answers = participant.answers || {};
        const complementaryAnswers = { ...answers };

        delete complementaryAnswers.age;
        delete complementaryAnswers.email;
        delete complementaryAnswers.phone;
        delete complementaryAnswers.origin_city;

        return [
          event.title,
          order.reference,
          statusLabel(order.paymentStatus),
          formatDate(order.createdAt),
          formatDate(order.updatedAt),
          order.payerFirstName,
          order.payerLastName,
          order.payerEmail,
          order.payerPhone || "",
          order.participants.length,
          amountToEurosText(order.subtotalAmount),
          amountToEurosText(order.extraDonationAmount),
          amountToEurosText(order.totalAmount),
          order.currency,
          order.stripeSessionId || "",
          order.stripePaymentIntentId || "",
          index + 1,
          participant.firstName,
          participant.lastName,
          answerValue(answers, "age"),
          answerValue(answers, "email"),
          answerValue(answers, "phone"),
          answerValue(answers, "origin_city"),
          rateById.get(participant.rateId) || participant.rateId,
          JSON.stringify(complementaryAnswers),
        ];
      });
    });

    const csv = [
      headers.map(csvEscape).join(";"),
      ...rows.map((row) => row.map(csvEscape).join(";")),
    ].join("\n");

    const safeSlug = event.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const suffix = selectedReferences ? "selection" : "payees";
    const filename = `inscriptions-${suffix}-${safeSlug}.csv`;

    return new NextResponse(`\uFEFF${csv}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erreur export CSV inscriptions billetterie", error);

    return NextResponse.json(
      { error: "Impossible d’exporter les inscriptions." },
      { status: 500 }
    );
  }
}