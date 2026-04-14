import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { storage } from "@/lib/storage";
import { getDestinationZone } from "@/lib/destinations";
import type { Order } from "@/lib/types";

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

function formatInvoiceDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("fr-FR");
}

function formatInvoiceNumber(order: Order, index: number) {
  const d = new Date(order.createdAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const seq = String(100 + index).padStart(4, "0");
  return `PF-${y}${m}${day}-${seq}`;
}

function drawCenteredText(
  page: any,
  text: string,
  y: number,
  size: number,
  font: any,
  color = rgb(0.08, 0.08, 0.08)
) {
  const pageWidth = page.getWidth();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (pageWidth - textWidth) / 2,
    y,
    size,
    font,
    color,
  });
}

function drawLabelValue(
  page: any,
  label: string,
  value: string,
  x: number,
  y: number,
  font: any,
  bold: any
) {
  page.drawText(label, {
    x,
    y,
    size: 11,
    font: bold,
    color: rgb(0.08, 0.08, 0.08),
  });
  page.drawText(value, {
    x: x + bold.widthOfTextAtSize(label, 11) + 4,
    y,
    size: 11,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
}

function totalDeclaredValue(order: Order) {
  return order.items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  );
}

function totalQuantity(order: Order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

async function drawInvoiceCopy(
  pdf: PDFDocument,
  order: Order,
  invoiceIndex: number,
  logo: any,
  cachet: any,
  signature: any,
  font: any,
  bold: any
) {
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const left = 50;
  const right = width - 50;
  let y = height - 58;

  if (logo) {
    const maxLogoWidth = 48;
    const scale = maxLogoWidth / logo.width;
    const logoWidth = logo.width * scale;
    const logoHeight = logo.height * scale;
    page.drawImage(logo, {
      x: (width - logoWidth) / 2,
      y: y - 6,
      width: logoWidth,
      height: logoHeight,
    });
    y -= logoHeight + 18;
  }

  drawCenteredText(page, "FACTURE PRO FORMA", y, 18, bold);

  y -= 30;
  drawLabelValue(page, "N°:", formatInvoiceNumber(order, invoiceIndex), left, y, font, bold);

  y -= 20;
  drawLabelValue(page, "Date:", formatInvoiceDate(order.createdAt), left, y, font, bold);

  y -= 34;

  const col1 = left;
  const col2 = 305;

  page.drawText("Expéditeur / Shipper", {
    x: col1,
    y,
    size: 11,
    font: bold,
  });

  page.drawText("Destinataire / Consignee", {
    x: col2,
    y,
    size: 11,
    font: bold,
  });

  y -= 18;

  const senderLines = [
    "SOLIDARITÉ CŒUR ACTIF (Association)",
    "53 rue Roger Salengro",
    "45120 Châlette-sur-Loing, FRANCE",
  ];

  const recipientLines = [
    `${safeText(order.customer.firstName)} ${safeText(order.customer.lastName)}`.trim(),
    safeText(order.shippingAddress?.city),
    safeText(order.shippingAddress?.address1),
    safeText(order.shippingAddress?.address2) || "nan nan",
    safeText(order.shippingAddress?.country),
  ];

  let y1 = y;
  for (const line of senderLines) {
    page.drawText(line, {
      x: col1,
      y: y1,
      size: 10,
      font,
    });
    y1 -= 14;
  }

  let y2 = y;
  for (const line of recipientLines.filter(Boolean)) {
    page.drawText(line, {
      x: col2,
      y: y2,
      size: 10,
      font,
    });
    y2 -= 14;
  }

  y = Math.min(y1, y2) - 24;

  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 18;

  page.drawText("Description", {
    x: left,
    y,
    size: 11,
    font: bold,
  });

  page.drawText("HS code", {
    x: 335,
    y,
    size: 11,
    font: bold,
  });

  page.drawText("Qté", {
    x: 470,
    y,
    size: 11,
    font: bold,
  });

  page.drawText("Valeur (€)", {
    x: 520,
    y,
    size: 11,
    font: bold,
  });

  y -= 10;

  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 24;

  const qty = totalQuantity(order);
  const declaredValue = totalDeclaredValue(order);
  const valueText = (declaredValue / 100).toFixed(2);

  page.drawText("Printed Book – Not for resale", {
    x: left,
    y,
    size: 10,
    font,
  });

  page.drawText("490199", {
    x: 340,
    y,
    size: 10,
    font,
  });

  page.drawText(String(qty), {
    x: 485,
    y,
    size: 10,
    font,
  });

  page.drawText(valueText, {
    x: 545 - font.widthOfTextAtSize(valueText, 10),
    y,
    size: 10,
    font,
  });

  y -= 28;

  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 24;

  page.drawText("Total", {
    x: 475,
    y,
    size: 11,
    font: bold,
  });

  page.drawText(valueText, {
    x: 545 - bold.widthOfTextAtSize(valueText, 11),
    y,
    size: 11,
    font: bold,
  });

  y -= 42;

  page.drawText("Incoterm: DAP", {
    x: left,
    y,
    size: 10,
    font,
  });

  y -= 16;

  page.drawText("Pays d'origine / Country of origin: FRANCE", {
    x: left,
    y,
    size: 10,
    font,
  });

  const footerY = 74;
  const labelY = footerY + 62;

  drawCenteredText(page, "Cachet et signature", labelY, 10, font);

  if (cachet) {
    const maxStampWidth = 140;
    const scale = maxStampWidth / cachet.width;
    const stampWidth = cachet.width * scale;
    const stampHeight = cachet.height * scale;
    page.drawImage(cachet, {
      x: width / 2 - stampWidth - 34,
      y: footerY,
      width: stampWidth,
      height: stampHeight,
      opacity: 0.96,
    });
  }

  if (signature) {
    const maxSigWidth = 90;
    const scale = maxSigWidth / signature.width;
    const sigWidth = signature.width * scale;
    const sigHeight = signature.height * scale;
    page.drawImage(signature, {
      x: width / 2 + 34,
      y: footerY + 4,
      width: sigWidth,
      height: sigHeight,
    });
  }
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

  const logoPath = path.join(process.cwd(), "public", "logo-association.png");
  const cachetPath = path.join(process.cwd(), "public", "cachet.png");
  const signaturePath = path.join(process.cwd(), "public", "signature.png");

  const logoBuffer = await readOptionalFileBuffer(logoPath);
  const cachetBuffer = await readOptionalFileBuffer(cachetPath);
  const signatureBuffer = await readOptionalFileBuffer(signaturePath);

  const embeddedLogo = logoBuffer ? await pdf.embedPng(logoBuffer) : null;
  const embeddedCachet = cachetBuffer ? await pdf.embedPng(cachetBuffer) : null;
  const embeddedSignature = signatureBuffer
    ? await pdf.embedPng(signatureBuffer)
    : null;

  let invoiceIndex = 100;

for (const order of orders) {
  const currentInvoiceIndex = invoiceIndex++;

  await drawInvoiceCopy(
    pdf,
    order,
    currentInvoiceIndex,
    embeddedLogo,
    embeddedCachet,
    embeddedSignature,
    font,
    bold
  );

  await drawInvoiceCopy(
    pdf,
    order,
    currentInvoiceIndex,
    embeddedLogo,
    embeddedCachet,
    embeddedSignature,
    font,
    bold
  );
}