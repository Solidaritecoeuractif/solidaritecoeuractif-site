import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { FORCED_POSTAL_CODES } from "@/lib/destinations";
import type { Order } from "@/lib/types";

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
  angleterre: "GB",
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
  slovenie: "SI",
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

function resolveCountryCode(rawCountry: string | undefined, fallback: string) {
  const cleaned = safeText(rawCountry);
  const normalized = normalizeText(rawCountry);

  if (!normalized) {
    return fallback;
  }

  if (COUNTRY_ALIASES[normalized]) {
    return COUNTRY_ALIASES[normalized];
  }

  if (/^[A-Z]{2}$/.test(cleaned.toUpperCase())) {
    return cleaned.toUpperCase();
  }

  return cleaned.toUpperCase();
}

function normalizeLogisticsStatus(
  value: string | undefined,
  fallback: Order["logisticsStatus"]
): Order["logisticsStatus"] {
  const normalized = safeText(value);

  if (
    normalized === "to_process" ||
    normalized === "prepared" ||
    normalized === "shipped" ||
    normalized === "delivered" ||
    normalized === "cancelled"
  ) {
    return normalized;
  }

  return fallback;
}

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const reference = safeText(body?.reference);

    if (!reference) {
      return NextResponse.json(
        { error: "Référence de commande manquante." },
        { status: 400 }
      );
    }

    const order = await storage().getOrderByReference(reference);

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 }
      );
    }

    const currentCountry = safeText(order.shippingAddress?.country);
    const country = resolveCountryCode(body?.shippingAddress?.country, currentCountry);
    const forcedPostalCode = FORCED_POSTAL_CODES[country] || "";
    const postalCode =
      safeText(body?.shippingAddress?.postalCode) || forcedPostalCode || "00000";

    const quantity = Math.max(1, Number(body?.quantity || 1));

    const updatedItems = order.items.map((item, index) =>
      index === 0
        ? {
            ...item,
            quantity,
          }
        : item
    );

    const updatedOrder: Order = {
      ...order,
      customer: {
        ...order.customer,
        firstName: safeText(body?.customer?.firstName),
        lastName: safeText(body?.customer?.lastName),
        email: safeText(body?.customer?.email),
        phone: safeText(body?.customer?.phone),
      },
      shippingAddress: order.shippingAddress
        ? {
            ...order.shippingAddress,
            country,
            city: safeText(body?.shippingAddress?.city),
            postalCode,
            address1: safeText(body?.shippingAddress?.address1),
            address2: safeText(body?.shippingAddress?.address2),
            notes: safeText(body?.shippingAddress?.notes),
          }
        : undefined,
      logisticsStatus: normalizeLogisticsStatus(
        body?.logisticsStatus,
        order.logisticsStatus
      ),
      items: updatedItems,
      updatedAt: new Date().toISOString(),
    };

    await storage().updateOrder(reference, updatedOrder);

    return NextResponse.json({
      success: true,
      reference,
      country,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de modifier la commande." },
      { status: 500 }
    );
  }
}