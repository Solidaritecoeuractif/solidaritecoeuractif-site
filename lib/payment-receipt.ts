import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { Order } from "@/lib/types";
import { readFile } from "node:fs/promises";
import path from "node:path";

function formatAmount(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(amountInCents / 100);
}

function hasPhysicalDelivery(order: Order) {
  return Boolean(order.shippingAddress);
}

async function embedLogo(pdf: PDFDocument) {
  const logoPath = path.join(process.cwd(), "public", "logo-association.png");
  const bytes = await readFile(logoPath);
  return pdf.embedPng(bytes);
}

export async function generatePaymentReceiptPdf(order: Order) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);

  const { width, height } = page.getSize();
  let y = height - 60;

  const logoWidth = 64;
  const logoHeight = 64;
  const logoX = (width - logoWidth) / 2;

  page.drawImage(logo, {
    x: logoX,
    y: y - 10,
    width: logoWidth,
    height: logoHeight,
  });

  y -= 86;

  const headerText = "ATTESTATION DE PAIEMENT";
  const headerSize = 18;
  const headerWidth = bold.widthOfTextAtSize(headerText, headerSize);

  page.drawText(headerText, {
    x: (width - headerWidth) / 2,
    y,
    size: headerSize,
    font: bold,
    color: rgb(0.08, 0.08, 0.08),
  });

  y -= 28;

  const orgText = "Solidarité Cœur Actif";
  const orgSize = 14;
  const orgWidth = bold.widthOfTextAtSize(orgText, orgSize);

  page.drawText(orgText, {
    x: (width - orgWidth) / 2,
    y,
    size: orgSize,
    font: bold,
    color: rgb(0.08, 0.08, 0.08),
  });

  y -= 18;

  const mailText = "Email : solidaritecoeuractif@gmail.com";
  const mailWidth = font.widthOfTextAtSize(mailText, 10);

  page.drawText(mailText, {
    x: (width - mailWidth) / 2,
    y,
    size: 10,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });

  y -= 14;

  const phoneText = "Téléphone : 0033745224124";
  const phoneWidth = font.widthOfTextAtSize(phoneText, 10);

  page.drawText(phoneText, {
    x: (width - phoneWidth) / 2,
    y,
    size: 10,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });

  y -= 34;

  page.drawText(
    "Ce document confirme la réception d’un paiement effectué sur la plateforme de l’association.",
    {
      x: 50,
      y,
      size: 10,
      font,
      maxWidth: width - 100,
      lineHeight: 14,
      color: rgb(0.12, 0.12, 0.12),
    }
  );

  y -= 44;

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
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 20;
  }

  y -= 8;

  page.drawText("Détail de la participation :", {
    x: 50,
    y,
    size: 12,
    font: bold,
    color: rgb(0.08, 0.08, 0.08),
  });

  y -= 22;

  for (const item of order.items) {
    const line = `• ${item.productTitle} × ${item.quantity} : ${formatAmount(
      item.unitAmount * item.quantity,
      order.currency
    )}`;

    page.drawText(line, {
      x: 60,
      y,
      size: 10,
      font,
      maxWidth: width - 120,
      color: rgb(0.12, 0.12, 0.12),
    });

    y -= 16;
  }

  if (hasPhysicalDelivery(order)) {
    y -= 20;

    page.drawText(
      "Pour les produits physiques, les informations de livraison seront communiquées par mail ou SMS par l’Agence de livraison partenaire.",
      {
        x: 50,
        y,
        size: 10,
        font,
        maxWidth: width - 100,
        lineHeight: 14,
        color: rgb(0.12, 0.12, 0.12),
      }
    );

    y -= 44;
  } else {
    y -= 26;
  }

  page.drawText(
    "Merci pour votre soutien. Cette attestation peut être conservée comme confirmation de paiement.",
    {
      x: 50,
      y,
      size: 10,
      font,
      maxWidth: width - 100,
      lineHeight: 14,
      color: rgb(0.12, 0.12, 0.12),
    }
  );

  y -= 38;

  const blessing = "Dieu vous bénisse";
  const blessingWidth = bold.widthOfTextAtSize(blessing, 12);

  page.drawText(blessing, {
    x: (width - blessingWidth) / 2,
    y,
    size: 12,
    font: bold,
    color: rgb(0.08, 0.08, 0.08),
  });

  return Buffer.from(await pdf.save());
}