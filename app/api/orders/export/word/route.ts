import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { storage } from "@/lib/storage";
import type { Order } from "@/lib/types";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const COUNTRY_LABELS: Record<string, string> = {
  FR: "France",
  GP: "Guadeloupe",
  MQ: "Martinique",
  GF: "Guyane française",
  RE: "La Réunion",
  YT: "Mayotte",
  PM: "Saint-Pierre-et-Miquelon",
  BL: "Saint-Barthélemy",
  MF: "Saint-Martin",
  WF: "Wallis-et-Futuna",
  PF: "Polynésie française",
  NC: "Nouvelle-Calédonie",
  TF: "Terres australes et antarctiques françaises",
  MA: "Maroc",
  DZ: "Algérie",
  TN: "Tunisie",
  LY: "Libye",
  MR: "Mauritanie",
  BE: "Belgique",
  CH: "Suisse",
  CA: "Canada",
  US: "États-Unis",
  GB: "Royaume-Uni",
  DE: "Allemagne",
  ES: "Espagne",
  IT: "Italie",
  PT: "Portugal",
  NL: "Pays-Bas",
  LU: "Luxembourg",
  IE: "Irlande",
  AT: "Autriche",
  SE: "Suède",
  NO: "Norvège",
  DK: "Danemark",
  FI: "Finlande",
  PL: "Pologne",
  CZ: "Tchéquie",
  SK: "Slovaquie",
  SI: "Slovénie",
  HR: "Croatie",
  HU: "Hongrie",
  RO: "Roumanie",
  BG: "Bulgarie",
  GR: "Grèce",
  CY: "Chypre",
  MT: "Malte",
  EE: "Estonie",
  LV: "Lettonie",
  LT: "Lituanie",
  IS: "Islande",
};

let templateBufferPromise: Promise<Buffer> | null = null;

function getTemplateBuffer() {
  if (!templateBufferPromise) {
    const templatePath = path.join(process.cwd(), "public", "Tableau vierge.docx");
    templateBufferPromise = fs.readFile(templatePath);
  }
  return templateBufferPromise;
}

function safeText(value: string | undefined) {
  return String(value || "").trim();
}

function cleanAddressLine(value: string | undefined) {
  const cleaned = safeText(value);
  if (!cleaned) return "";
  if (cleaned.toLowerCase() === "nan nan") return "";
  return cleaned;
}

function normalizeCountryCode(value: string | undefined) {
  return safeText(value).toUpperCase();
}

function countryLabelForWord(value: string | undefined) {
  const raw = safeText(value);
  if (!raw) return "";

  const normalized = normalizeCountryCode(raw);

  if (COUNTRY_LABELS[normalized]) {
    return COUNTRY_LABELS[normalized];
  }

  if (raw.startsWith("FR-")) {
    const suffix = raw.slice(3).toUpperCase();
    if (COUNTRY_LABELS[suffix]) {
      return COUNTRY_LABELS[suffix];
    }
  }

  return raw;
}

function totalQuantity(order: Order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

function buildAddressLines(order: Order) {
  const fullName =
    `${safeText(order.customer.firstName)} ${safeText(order.customer.lastName)}`.trim();

  const address1 = safeText(order.shippingAddress?.address1);
  const address2 = cleanAddressLine(order.shippingAddress?.address2);

  const postalCity = [
    safeText(order.shippingAddress?.postalCode),
    safeText(order.shippingAddress?.city),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const country = countryLabelForWord(order.shippingAddress?.country);
  const phone = safeText(order.customer.phone);
  const quantity = totalQuantity(order);

  return [
    fullName,
    address1,
    address2,
    postalCity,
    country,
    phone ? `Téléphone : ${phone}` : "",
    `Quantité : ${quantity}`,
  ].filter(Boolean);
}

function createRun(doc: any, text: string) {
  const run = doc.createElementNS(W_NS, "w:r");
  const textNode = doc.createElementNS(W_NS, "w:t");

  if (/^\s|\s$|\s{2,}/.test(text)) {
    textNode.setAttribute("xml:space", "preserve");
  }

  textNode.appendChild(doc.createTextNode(text));
  run.appendChild(textNode);
  return run;
}

function createParagraph(doc: any, text = "") {
  const paragraph = doc.createElementNS(W_NS, "w:p");
  const run = createRun(doc, text);
  paragraph.appendChild(run);
  return paragraph;
}

function setCellLines(doc: any, cell: any, lines: string[]) {
  const children: any[] = [];
  const childNodes = cell?.childNodes;

  if (childNodes && typeof childNodes.length === "number") {
    for (let i = 0; i < childNodes.length; i += 1) {
      children.push(childNodes[i]);
    }
  }

  for (const child of children) {
    if (child && child.nodeType === 1 && child.localName !== "tcPr") {
      cell.removeChild(child);
    }
  }

  if (lines.length === 0) {
    cell.appendChild(createParagraph(doc, ""));
    return;
  }

  for (const line of lines) {
    cell.appendChild(createParagraph(doc, line));
  }
}

function getAllTableCells(doc: any) {
  return Array.from(doc.getElementsByTagNameNS(W_NS, "tc") || []);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refs = searchParams.getAll("refs");

  if (refs.length === 0) {
    return NextResponse.json(
      { error: "Aucune commande sélectionnée pour l’export Word." },
      { status: 400 }
    );
  }

  let orders = await storage().getOrders();

  orders = orders.filter(
    (order) =>
      order.paymentStatus === "paid" &&
      order.shippingAddress &&
      refs.includes(order.reference)
  );

  const refOrder = new Map(refs.map((ref, index) => [ref, index]));
  orders.sort(
    (a, b) =>
      (refOrder.get(a.reference) ?? Number.MAX_SAFE_INTEGER) -
      (refOrder.get(b.reference) ?? Number.MAX_SAFE_INTEGER)
  );

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "Aucune commande exploitable avec adresse n’a été trouvée." },
      { status: 400 }
    );
  }

  const templateBuffer = await getTemplateBuffer();

  const zip = new PizZip(templateBuffer);
  const documentXmlFile = zip.file("word/document.xml");

  if (!documentXmlFile) {
    return NextResponse.json(
      { error: "Le modèle Word est invalide : word/document.xml introuvable." },
      { status: 500 }
    );
  }

  const xml = documentXmlFile.asText();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const cells = getAllTableCells(doc);

  if (cells.length === 0) {
    return NextResponse.json(
      { error: "Le modèle Word ne contient aucune cellule exploitable." },
      { status: 500 }
    );
  }

  if (orders.length > cells.length) {
    return NextResponse.json(
      {
        error: `Le modèle Word ne contient pas assez de cellules. Commandes sélectionnées : ${orders.length}, cellules disponibles : ${cells.length}.`,
      },
      { status: 400 }
    );
  }

  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const order = orders[i];

    if (!order) {
      setCellLines(doc, cell, []);
      continue;
    }

    const lines = buildAddressLines(order);
    setCellLines(doc, cell, lines);
  }

  const updatedXml = new XMLSerializer().serializeToString(doc);
  zip.file("word/document.xml", updatedXml);

  const outputBuffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  });

  return new NextResponse(outputBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="adresses-selection.docx"',
      "Cache-Control": "private, max-age=300",
    },
  });
}