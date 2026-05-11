import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

function formatDate(value?: string) {
  if (!value) return "";

  try {
    return new Date(value).toISOString();
  } catch {
    return value;
  }
}

function answerValue(answers: Record<string, unknown>, key: string) {
  return answers?.[key] ?? "";
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

function amountToEuros(value: number) {
  return value / 100;
}

async function authorizeEvent(eventId: string) {
  const session = await getOrganizerSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Connexion organisateur requise." },
        { status: 401 }
      ),
    };
  }

  const storage = ticketingStorage();

  const organizer = await storage.getTicketingOrganizerAccountById(
    session.organizerId
  );

  if (!organizer || organizer.status !== "active") {
    return {
      error: NextResponse.json(
        { error: "Compte organisateur inactif ou introuvable." },
        { status: 403 }
      ),
    };
  }

  const event = await storage.getTicketingEventById(eventId);

  if (!event || event.ownerOrganizerId !== organizer.id) {
    return {
      error: NextResponse.json(
        { error: "Billetterie introuvable ou non autorisée." },
        { status: 404 }
      ),
    };
  }

  return {
    storage,
    event,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authorization = await authorizeEvent(id);

    if (authorization.error) {
      return authorization.error;
    }

    const { storage, event } = authorization;

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

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Solidarité Cœur Actif";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Inscriptions payées", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Événement", key: "event", width: 34 },
      { header: "Référence", key: "reference", width: 22 },
      { header: "Date création", key: "createdAt", width: 22 },
      { header: "Date mise à jour", key: "updatedAt", width: 22 },
      { header: "Contact prénom", key: "payerFirstName", width: 18 },
      { header: "Contact nom", key: "payerLastName", width: 18 },
      { header: "Contact email", key: "payerEmail", width: 28 },
      { header: "Contact téléphone", key: "payerPhone", width: 18 },
      { header: "Nombre participants", key: "participantsCount", width: 18 },
      { header: "Montant événement", key: "eventAmount", width: 18 },
      { header: "Devise", key: "currency", width: 10 },
      { header: "Participant n°", key: "participantNumber", width: 14 },
      { header: "Participant prénom", key: "participantFirstName", width: 20 },
      { header: "Participant nom", key: "participantLastName", width: 20 },
      { header: "Âge", key: "participantAge", width: 10 },
      { header: "Email", key: "participantEmail", width: 28 },
      { header: "Téléphone", key: "participantPhone", width: 18 },
      { header: "Ville d’origine", key: "participantOriginCity", width: 22 },
      { header: "Tarif", key: "participantRate", width: 24 },
      { header: "Réponses complémentaires", key: "answers", width: 42 },
    ];

    for (const order of orders) {
      if (order.participants.length === 0) {
        sheet.addRow({
          event: event.title,
          reference: order.reference,
          createdAt: formatDate(order.createdAt),
          updatedAt: formatDate(order.updatedAt),
          payerFirstName: order.payerFirstName,
          payerLastName: order.payerLastName,
          payerEmail: order.payerEmail,
          payerPhone: order.payerPhone || "",
          participantsCount: order.participants.length,
          eventAmount: amountToEuros(order.subtotalAmount),
          currency: order.currency,
        });
      }

      order.participants.forEach((participant, index) => {
        const answers = participant.answers || {};
        const complementaryAnswers = { ...answers };

        delete complementaryAnswers.age;
        delete complementaryAnswers.email;
        delete complementaryAnswers.phone;
        delete complementaryAnswers.origin_city;

        sheet.addRow({
          event: event.title,
          reference: order.reference,
          createdAt: formatDate(order.createdAt),
          updatedAt: formatDate(order.updatedAt),
          payerFirstName: order.payerFirstName,
          payerLastName: order.payerLastName,
          payerEmail: order.payerEmail,
          payerPhone: order.payerPhone || "",
          participantsCount: order.participants.length,
          eventAmount: amountToEuros(order.subtotalAmount),
          currency: order.currency,
          participantNumber: index + 1,
          participantFirstName: participant.firstName,
          participantLastName: participant.lastName,
          participantAge: answerValue(answers, "age"),
          participantEmail: answerValue(answers, "email"),
          participantPhone: answerValue(answers, "phone"),
          participantOriginCity: answerValue(answers, "origin_city"),
          participantRate: rateById.get(participant.rateId) || participant.rateId,
          answers: JSON.stringify(complementaryAnswers),
        });
      });
    }

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 22;

    sheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        cell.alignment = {
          vertical: "top",
          wrapText: true,
        };

        if (rowNumber > 1 && rowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          };
        }
      });
    });

    sheet.getColumn("eventAmount").numFmt = '#,##0.00 €';

    sheet.autoFilter = {
      from: "A1",
      to: "T1",
    };

    const buffer = await workbook.xlsx.writeBuffer();

    const safeSlug = event.slug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const suffix = selectedReferences ? "selection" : "payees";
    const filename = `inscriptions-${suffix}-${safeSlug}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erreur export XLSX organisateur", error);

    return NextResponse.json(
      { error: "Impossible d’exporter les inscriptions au format XLSX." },
      { status: 500 }
    );
  }
}