import { NextResponse } from "next/server";

type ParsedPrivateOrder = {
  index: number;
  rawBlock: string;
  nom: string;
  prenom: string;
  adresse: string;
  complement: string;
  codePostal: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
  produit: string;
  quantite: number | null;
  errors: string[];
};

const FIELD_ALIASES: Record<string, keyof Omit<ParsedPrivateOrder, "index" | "rawBlock" | "errors" | "quantite"> | "quantite"> = {
  nom: "nom",
  prénom: "prenom",
  prenom: "prenom",
  adresse: "adresse",
  complément: "complement",
  complement: "complement",
  "code postal": "codePostal",
  codepostal: "codePostal",
  ville: "ville",
  pays: "pays",
  téléphone: "telephone",
  telephone: "telephone",
  tél: "telephone",
  tel: "telephone",
  email: "email",
  mail: "email",
  produit: "produit",
  quantité: "quantite",
  quantite: "quantite",
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function splitBlocks(rawText: string) {
  return rawText
    .split(/\n\s*---+\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseQuantity(value: string) {
  const numeric = Number(String(value || "").replace(",", ".").trim());
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
}

function parseBlock(block: string, index: number): ParsedPrivateOrder {
  const base: ParsedPrivateOrder = {
    index,
    rawBlock: block,
    nom: "",
    prenom: "",
    adresse: "",
    complement: "",
    codePostal: "",
    ville: "",
    pays: "",
    telephone: "",
    email: "",
    produit: "",
    quantite: null,
    errors: [],
  };

  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^([^:]+)\s*:\s*(.*)$/);
    if (!match) continue;

    const rawKey = normalizeText(match[1]);
    const rawValue = String(match[2] || "").trim();
    const mappedKey = FIELD_ALIASES[rawKey];

    if (!mappedKey) continue;

    if (mappedKey === "quantite") {
      base.quantite = parseQuantity(rawValue);
      continue;
    }

    base[mappedKey] = rawValue;
  }

  if (!base.nom) {
    base.errors.push("Nom manquant.");
  }

  if (!base.prenom) {
    base.errors.push("Prénom manquant.");
  }

  if (!base.adresse) {
    base.errors.push("Adresse manquante.");
  }

  if (!base.ville) {
    base.errors.push("Ville manquante.");
  }

  if (!base.pays) {
    base.errors.push("Pays manquant.");
  }

  if (!base.telephone) {
    base.errors.push("Téléphone manquant.");
  }

  if (!base.produit) {
    base.errors.push("Produit manquant.");
  }

  if (!base.quantite) {
    base.errors.push("Quantité invalide ou manquante.");
  }

  return base;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawText = String(body?.rawText || "").trim();

    if (!rawText) {
      return NextResponse.json(
        { error: "Aucun texte à analyser." },
        { status: 400 }
      );
    }

    const blocks = splitBlocks(rawText);

    if (blocks.length === 0) {
      return NextResponse.json(
        { error: "Aucune commande détectée dans le copier-coller." },
        { status: 400 }
      );
    }

    const orders = blocks.map((block, index) => parseBlock(block, index));

    return NextResponse.json({
      orders,
      totalBlocks: blocks.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible d’analyser les commandes privées." },
      { status: 500 }
    );
  }
}