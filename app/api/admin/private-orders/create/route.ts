import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { uniqueId, orderReference } from "@/lib/utils";
import { DESTINATION_OPTIONS, FORCED_POSTAL_CODES } from "@/lib/destinations";
import type { Order } from "@/lib/types";

type IncomingPrivateOrder = {
  nom: string;
  prenom: string;
  adresse: string;
  complement?: string;
  codePostal?: string;
  ville: string;
  pays: string;
  telephone: string;
  email?: string;
  produit: string;
  quantite: number | null;
};

const COUNTRY_ALIASES: Record<string, string> = {
  france: "FR",
  guadeloupe: "GP",
  martinique: "MQ",
  "guyane francaise": "GF",
  guyane: "GF",
  reunion: "RE",
  "la reunion": "RE",
  mayotte: "YT",
  "saint pierre et miquelon": "PM",
  "saint barthelemy": "BL",
  "saint martin": "MF",
  "wallis et futuna": "WF",
  "polynesie francaise": "PF",
  "nouvelle caledonie": "NC",
  maroc: "MA",
  algerie: "DZ",
  tunisie: "TN",
  libye: "LY",
  mauritanie: "MR",
  belgique: "BE",
  suisse: "CH",
  canada: "CA",
  "etats unis": "US",
  "etats unis d amerique": "US",
  "etats unis d'amerique": "US",
  usa: "US",
  "u s a": "US",
  "u.s.a": "US",
  "u.s.a.": "US",
  "united states": "US",
  "united states of america": "US",
  "royaume uni": "GB",
  "angleterre": "GB",
  allemagne: "DE",
  espagne: "ES",
  italie: "IT",
  portugal: "PT",
  "pays bas": "NL",
  luxembourg: "LU",
  irlande: "IE",
  autriche: "AT",
  suede: "SE",
  norvege: "NO",
  danemark: "DK",
  finlande: "FI",
  pologne: "PL",
  tchequie: "CZ",
  slovaquie: "SK",
  sloveniе: "SI",
  croatie: "HR",
  hongrie: "HU",
  roumanie: "RO",
  bulgarie: "BG",
  grece: "GR",
  chypre: "CY",
  malte: "MT",
  estonie: "EE",
  lettonie: "LV",
  lituanie: "LT",
  islande: "IS",
  benin: "BJ",
  togo: "TG",
  "cote d ivoire": "CI",
  "cote d'ivoire": "CI",
  senegal: "SN",
  cameroun: "CM",
  congo: "CG",
  "republique democratique du congo": "CD",
  gabon: "GA",
  burkina: "BF",
  "burkina faso": "BF",
  mali: "ML",
  niger: "NE",
  tchad: "TD",
  guinea: "GN",
  guinee: "GN",
};

function safeText(value: string | undefined) {
  return String(value || "").trim();
}

function normalizeText(value: string | undefined) {
  return safeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDestinationCode(rawCountry: string) {
  const cleaned = safeText(rawCountry);
  const normalized = normalizeText(rawCountry);

  if (!normalized) {
    return "";
  }

  if (COUNTRY_ALIASES[normalized]) {
    return COUNTRY_ALIASES[normalized];
  }

  const exactCode = DESTINATION_OPTIONS.find(
    (option) => normalizeText(option.code) === normalized
  );

  if (exactCode) {
    return exactCode.code;
  }

  const exactLabel = DESTINATION_OPTIONS.find(
    (option) => normalizeText(option.label) === normalized
  );

  if (exactLabel) {
    return exactLabel.code;
  }

  const partialLabel = DESTINATION_OPTIONS.find((option) => {
    const label = normalizeText(option.label);
    return label.includes(normalized) || normalized.includes(label);
  });

  if (partialLabel) {
    return partialLabel.code;
  }

  if (/^[A-Z]{2}$/.test(cleaned.toUpperCase())) {
    return cleaned.toUpperCase();
  }

  return "";
}

function findProductByTitle(
  products: Array<{
    id: string;
    title: string;
    offerType: string;
    pricingMode: string;
    fixedPrice?: number | null;
    isActive?: boolean;
  }>,
  rawTitle: string
) {
  const normalized = normalizeText(rawTitle);

  const exact = products.find(
    (product) => normalizeText(product.title) === normalized
  );

  if (exact) {
    return exact;
  }

  const partial = products.find(
    (product) =>
      normalizeText(product.title).includes(normalized) ||
      normalized.includes(normalizeText(product.title))
  );

  return partial || null;
}

function validateIncomingOrder(order: IncomingPrivateOrder, index: number) {
  const errors: string[] = [];

  if (!safeText(order.nom)) {
    errors.push(`Commande ${index + 1} : nom manquant.`);
  }

  if (!safeText(order.prenom)) {
    errors.push(`Commande ${index + 1} : prénom manquant.`);
  }

  if (!safeText(order.adresse)) {
    errors.push(`Commande ${index + 1} : adresse manquante.`);
  }

  if (!safeText(order.ville)) {
    errors.push(`Commande ${index + 1} : ville manquante.`);
  }

  if (!safeText(order.pays)) {
    errors.push(`Commande ${index + 1} : pays manquant.`);
  }

  if (!safeText(order.telephone)) {
    errors.push(`Commande ${index + 1} : téléphone manquant.`);
  }

  if (!safeText(order.produit)) {
    errors.push(`Commande ${index + 1} : produit manquant.`);
  }

  if (!order.quantite || order.quantite <= 0) {
    errors.push(`Commande ${index + 1} : quantité invalide.`);
  }

  return errors;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const incomingOrders = Array.isArray(body?.orders) ? body.orders : [];

    if (incomingOrders.length === 0) {
      return NextResponse.json(
        { error: "Aucune commande privée à créer." },
        { status: 400 }
      );
    }

    const products = await storage().getProducts();

    const validationErrors = incomingOrders.flatMap(
      (order: IncomingPrivateOrder, index: number) =>
        validateIncomingOrder(order, index)
    );

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: validationErrors.join(" ") },
        { status: 400 }
      );
    }

    const createdReferences: string[] = [];

    for (let i = 0; i < incomingOrders.length; i += 1) {
      const incoming = incomingOrders[i] as IncomingPrivateOrder;

      const matchedProduct = findProductByTitle(products, incoming.produit);

      if (!matchedProduct) {
        return NextResponse.json(
          {
            error: `Produit introuvable pour la commande ${i + 1} : ${incoming.produit}`,
          },
          { status: 400 }
        );
      }

      const destinationCode = findDestinationCode(incoming.pays);

      if (!destinationCode) {
        return NextResponse.json(
          {
            error: `Pays non reconnu pour la commande ${i + 1} : ${incoming.pays}`,
          },
          { status: 400 }
        );
      }

      const quantity = Number(incoming.quantite || 0);
      const forcedPostalCode = FORCED_POSTAL_CODES[destinationCode] || "";
      const postalCode =
        safeText(incoming.codePostal) || forcedPostalCode || "00000";

      const unitAmount =
        matchedProduct.pricingMode === "fixed"
          ? Number(matchedProduct.fixedPrice || 0)
          : 0;

      const subtotalAmount = unitAmount * quantity;
      const shippingAmount = 0;
      const totalAmount = subtotalAmount + shippingAmount;

      const now = new Date().toISOString();
      const reference = orderReference();

      const order: Order = {
        id: uniqueId("ord"),
        reference,
        customer: {
          firstName: safeText(incoming.prenom),
          lastName: safeText(incoming.nom),
          email: safeText(incoming.email),
          phone: safeText(incoming.telephone),
        },
        shippingAddress: {
          country: destinationCode,
          address1: safeText(incoming.adresse),
          address2: safeText(incoming.complement),
          postalCode,
          city: safeText(incoming.ville),
          notes: "",
        },
        items: [
          {
            id: uniqueId("item"),
            productId: matchedProduct.id,
            productTitle: matchedProduct.title,
            offerType: matchedProduct.offerType as any,
            pricingMode: matchedProduct.pricingMode as any,
            unitAmount,
            quantity,
            customAmount: undefined,
          },
        ],
        subtotalAmount,
        shippingAmount,
        totalAmount,
        paymentStatus: "paid",
        logisticsStatus: "to_process",
        currency: "EUR",
        createdAt: now,
        updatedAt: now,
      };

      await storage().saveOrder(order);
      createdReferences.push(reference);
    }

    return NextResponse.json({
      createdCount: createdReferences.length,
      references: createdReferences,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de créer les commandes privées." },
      { status: 500 }
    );
  }
}