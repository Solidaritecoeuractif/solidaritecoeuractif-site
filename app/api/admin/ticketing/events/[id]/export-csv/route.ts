import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatAmount(amount?: number) {
  if (typeof amount !== "number") return "0,00";
  return (amount / 100).toFixed(2).replace(".", ",");
}

function statusLabel(status: string) {
  if (status === "paid") return "Payée";
  if (status === "cancelled") return "Annulée";
  return "En attente";
}

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function GET(
  _request: Request,
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

    const [orders, rates] = await Promise.all([
      storage.getTicketingOrders(event.id),
      storage.getTicketingRates(event.id),
    ]);

    const rateNameById = new Map(
      rates.map((rate) => [rate.id, rate.name || "Tarif sans nom"])
    );

    const headers = [
      "reference_inscription",
      "statut_paiement",
      "date_creation",
      "billetterie",
      "prenom_payeur",
      "nom_payeur",
      "email_payeur",
      "telephone_payeur",
      "prenom_participant",
      "nom_participant",
      "tarif",
      "sous_total_billets_eur",
      "contribution_libre_eur",
      "total_eur",
      "devise",
    ];

    const rows: string[][] = [];

    for (const order of orders) {
      if (order.participants.length === 0) {
        rows.push([
          order.reference,
          statusLabel(order.paymentStatus),
          formatDate(order.createdAt),
          event.title,
          order.payerFirstName,
          order.payerLastName,
          order.payerEmail,
          order.payerPhone ?? "",
          "",
          "",
          "",
          formatAmount(order.subtotalAmount),
          formatAmount(order.extraDonationAmount),
          formatAmount(order.totalAmount),
          order.currency.toUpperCase(),
        ]);

        continue;
      }

      for (const participant of order.participants) {
        rows.push([
          order.reference,
          statusLabel(order.paymentStatus),
          formatDate(order.createdAt),
          event.title,
          order.payerFirstName,
          order.payerLastName,
          order.payerEmail,
          order.payerPhone ?? "",
          participant.firstName,
          participant.lastName,
          rateNameById.get(participant.rateId) || "Tarif introuvable",
          formatAmount(order.subtotalAmount),
          formatAmount(order.extraDonationAmount),
          formatAmount(order.totalAmount),
          order.currency.toUpperCase(),
        ]);
      }
    }

    const csv =
      "\uFEFF" +
      [headers, ...rows]
        .map((row) => row.map(csvEscape).join(";"))
        .join("\r\n");

    const fileName = `inscriptions-billetterie-${safeFileName(
      event.slug
    )}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erreur export CSV inscriptions billetterie", error);

    return NextResponse.json(
      { error: "Impossible d’exporter les inscriptions de cette billetterie." },
      { status: 500 }
    );
  }
}