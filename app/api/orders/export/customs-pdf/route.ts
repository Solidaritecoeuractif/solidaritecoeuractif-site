import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { storage } from "@/lib/storage";
import { getDestinationZone } from "@/lib/destinations";
import type { Order } from "@/lib/types";

function formatAmount(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(amountInCents / 100);
}

function customsEligible(order: Order) {
  const code = order.shippingAddress?.country || "";
  const zone = getDestinationZone(code);
  return zone === "international" || zone === "afrique";
}

async function readOptionalFileBuffer(filePath: string) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

function safeText(value: string | undefined) {
  return String(value || "").trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refs = searchParams.getAll("refs");

  let orders = await storage().getOrders();

  if (refs.length > 0) {
    orders = orders.filter((order) => refs.includes(order.reference));
  } else {
    orders = orders.filter((order) => order.paymentStatus === "paid");
  }

  orders = orders.filter(
    (order) => order.paymentStatus === "paid" && order.shippingAddress
  );

  orders = orders.filter(customsEligible);

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "Aucune commande internationale sélectionnée pour l’export douanier." },
      { status: 400 }
    );
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const cachetPath = path.join(process.cwd(), "public", "cachet.png");
  const signaturePath = path.join(process.cwd(), "public", "signature.png");

  const cachetBuffer = await readOptionalFileBuffer(cachetPath);
  const signatureBuffer = await readOptionalFileBuffer(signaturePath);

  const embeddedCachet = cachetBuffer ? await pdf.embedPng(cachetBuffer) : null;
  const embeddedSignature = signatureBuffer
    ? await pdf.embedPng(signatureBuffer)
    : null;

  for (const order of orders) {
    const page = pdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const left = 50;
    let y = height - 50;

    page.drawText("SOLIDARITÉ CŒUR ACTIF", {
      x: left,
      y,
      size: 18,
      font: bold,
      color: rgb(0.08, 0.08, 0.08),
    });

    y -= 24;
    page.drawText("Facture / fiche douanière", {
      x: left,
      y,
      size: 15,
      font: bold,
    });

    y -= 18;
    page.drawText(`Référence : ${order.reference}`, {
      x: left,
      y,
      size: 10,
      font,
    });

    y -= 14;
    page.drawText(
      `Date : ${new Date(order.createdAt).toLocaleString("fr-FR")}`,
      {
        x: left,
        y,
        size: 10,
        font,
      }
    );

    y -= 28;
    page.drawText("Expéditeur", {
      x: left,
      y,
      size: 12,
      font: bold,
    });

    y -= 18;
    const senderLines = [
      "Solidarité Cœur Actif",
      "France",
      "Email : solidaritecoeuractif@gmail.com",
      "Téléphone : 0033 7 45 22 41 24",
    ];

    for (const line of senderLines) {
      page.drawText(line, { x: left, y, size: 10, font });
      y -= 14;
    }

    y -= 12;
    page.drawText("Destinataire", {
      x: left,
      y,
      size: 12,
      font: bold,
    });

    y -= 18;
    const recipientLines = [
      `${safeText(order.customer.firstName)} ${safeText(order.customer.lastName)}`.trim(),
      safeText(order.shippingAddress?.address1),
      safeText(order.shippingAddress?.address2),
      `${safeText(order.shippingAddress?.postalCode)} ${safeText(order.shippingAddress?.city)}`.trim(),
      safeText(order.shippingAddress?.country),
      `Email : ${safeText(order.customer.email)}`,
      `Téléphone : ${safeText(order.customer.phone)}`,
    ].filter(Boolean);

    for (const line of recipientLines) {
      page.drawText(line, { x: left, y, size: 10, font });
      y -= 14;
    }

    y -= 14;
    page.drawText("Contenu de l’envoi", {
      x: left,
      y,
      size: 12,
      font: bold,
    });

    y -= 18;

    for (const item of order.items) {
      const lineTotal = item.unitAmount * item.quantity;
      const line = `${item.productTitle} — Qté ${item.quantity} — Valeur ${formatAmount(
        lineTotal,
        order.currency
      )}`;
      page.drawText(line, {
        x: left,
        y,
        size: 10,
        font,
        maxWidth: width - 100,
      });
      y -= 16;
    }

    y -= 10;
    page.drawText(
      `Valeur déclarée totale : ${formatAmount(order.totalAmount, order.currency)}`,
      {
        x: left,
        y,
        size: 11,
        font: bold,
      }
    );

    y -= 18;
    page.drawText("Nature : documents / ouvrages imprimés", {
      x: left,
      y,
      size: 10,
      font,
    });

    y -= 14;
    page.drawText("Origine : France", {
      x: left,
      y,
      size: 10,
      font,
    });

    y -= 14;
    page.drawText("Usage : envoi associatif", {
      x: left,
      y,
      size: 10,
      font,
    });

    if (embeddedSignature) {
      const signatureDims = embeddedSignature.scale(0.28);
      page.drawImage(embeddedSignature, {
        x: width - 210,
        y: 110,
        width: signatureDims.width,
        height: signatureDims.height,
      });
    }

    if (embeddedCachet) {
      const cachetDims = embeddedCachet.scale(0.32);
      page.drawImage(embeddedCachet, {
        x: width - 190,
        y: 35,
        width: cachetDims.width,
        height: cachetDims.height,
        opacity: 0.95,
      });
    }

    page.drawText("Signature et cachet", {
      x: width - 190,
      y: 155,
      size: 10,
      font: bold,
    });
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="fiches-douanieres-selection.pdf"',
    },
  });
}