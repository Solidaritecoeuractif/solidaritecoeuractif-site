import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Order } from "@/lib/types";

function formatAmount(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(amountInCents / 100);
}

export async function generatePaymentReceiptPdf(order: Order) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  let y = height - 60;

  page.drawText("Solidarité Cœur Actif", {
    x: 50,
    y,
    size: 18,
    font: bold,
    color: rgb(0.08, 0.08, 0.08),
  });

  y -= 28;
  page.drawText("Attestation de paiement", {
    x: 50,
    y,
    size: 16,
    font: bold,
  });

  y -= 26;
  page.drawText(
    "Ce document confirme la réception d’un paiement effectué sur la plateforme de l’association.",
    {
      x: 50,
      y,
      size: 10,
      font,
      maxWidth: width - 100,
      lineHeight: 14,
    }
  );

  y -= 42;

  const rows = [
    `Référence : ${order.reference}`,
    `Date : ${new Date(order.updatedAt || order.createdAt).toLocaleString("fr-FR")}`,
    `Nom : ${`${order.customer.firstName} ${order.customer.lastName}`.trim()}`,
    `Email : ${order.customer.email}`,
    `Téléphone : ${order.customer.phone}`,
    `Statut : Paiement confirmé`,
    `Sous-total : ${formatAmount(order.subtotalAmount, order.currency)}`,
    `Livraison : ${formatAmount(order.shippingAmount, order.currency)}`,
    `Total payé : ${formatAmount(order.totalAmount, order.currency)}`,
  ];

  for (const row of rows) {
    page.drawText(row, {
      x: 50,
      y,
      size: 11,
      font,
    });
    y -= 20;
  }

  y -= 10;
  page.drawText("Détail de la participation :", {
    x: 50,
    y,
    size: 12,
    font: bold,
  });

  y -= 22;

  for (const item of order.items) {
    const line = `- ${item.productTitle} × ${item.quantity} : ${formatAmount(
      item.unitAmount * item.quantity,
      order.currency
    )}`;

    page.drawText(line, {
      x: 60,
      y,
      size: 10,
      font,
      maxWidth: width - 120,
    });

    y -= 16;
  }

  y -= 24;
  page.drawText(
    "Merci pour votre soutien. Cette attestation peut être conservée comme confirmation de paiement.",
    {
      x: 50,
      y,
      size: 10,
      font,
      maxWidth: width - 100,
      lineHeight: 14,
    }
  );

  return Buffer.from(await pdf.save());
}