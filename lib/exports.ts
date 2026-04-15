import * as XLSX from "xlsx";
import type { Order, Product } from "@/lib/types";

export function exportRows(orders: Order[]) {
  return orders.map((order) => ({
    reference_commande: order.reference,
    date_creation: order.createdAt,
    date_mise_a_jour: order.updatedAt,
    prenom: order.customer.firstName,
    nom: order.customer.lastName,
    email: order.customer.email,
    telephone: order.customer.phone,
    pays: order.shippingAddress?.country || "",
    adresse: order.shippingAddress?.address1 || "",
    complement_adresse: order.shippingAddress?.address2 || "",
    code_postal: order.shippingAddress?.postalCode || "",
    ville: order.shippingAddress?.city || "",
    notes_livraison: order.shippingAddress?.notes || "",
    quantite_totale: order.items.reduce((sum, item) => sum + item.quantity, 0),
    lignes_commande: order.items
      .map(
        (item) =>
          `${item.productTitle} x${item.quantity} @ ${(
            item.unitAmount / 100
          ).toFixed(2)}€`
      )
      .join(" | "),
    sous_total: (order.subtotalAmount / 100).toFixed(2),
    livraison: (order.shippingAmount / 100).toFixed(2),
    montant_paye: (order.totalAmount / 100).toFixed(2),
    devise: order.currency,
    statut_paiement: order.paymentStatus,
    statut_logistique: order.logisticsStatus,
    stripe_session_id: order.stripeSessionId || "",
    stripe_payment_intent_id: order.stripePaymentIntentId || "",
    source_donnees: "commande_interne_site",
  }));
}

export function toCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const bom = "\uFEFF";
  const lines = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map(
      (header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`
    );
    lines.push(values.join(","));
  }

  return `${bom}${lines.join("\n")}`;
}

export function toXlsxBuffer(rows: Record<string, string | number>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Commandes");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
}

function normalizePhone(phone: string) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

function formatShipDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function isEuropeanCountry(code: string) {
  const eu = new Set([
    "AT",
    "BE",
    "BG",
    "HR",
    "CY",
    "CZ",
    "DK",
    "EE",
    "FI",
    "FR",
    "DE",
    "GR",
    "HU",
    "IE",
    "IT",
    "LV",
    "LT",
    "LU",
    "MT",
    "NL",
    "PL",
    "PT",
    "RO",
    "SK",
    "SI",
    "ES",
    "SE",
  ]);
  return eu.has(code);
}

function chronopostProductCode(countryCode: string) {
  if (countryCode === "FR") return "2L";
  if (isEuropeanCountry(countryCode)) return "44";
  return "17";
}

function computeChronopostWeight(order: Order, products: Product[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  let totalGrams = 0;

  for (const item of order.items) {
    const product = item.productId ? productMap.get(item.productId) : undefined;
    const unitWeightGrams = product?.weightGrams ?? 600;
    totalGrams += unitWeightGrams * item.quantity;
  }

  const finalGrams = totalGrams > 0 ? totalGrams + 50 : 650;
  const weightKg = finalGrams / 1000;

  return weightKg.toFixed(3).replace(".", ",");
}

export function chronopostRows(orders: Order[], products: Product[]) {
  return orders
    .filter((order) => order.paymentStatus === "paid" && order.shippingAddress)
    .map((order) => {
      const country = order.shippingAddress?.country || "FR";

      return {
        "Référence destinataire": order.reference,
        "Nom ou Raison sociale": order.customer.lastName || "",
        "Suite Nom ou Suite Raison sociale ou Prénom ou Contact":
          order.customer.firstName || "",
        "Suite Nom 2 ou Suite Raison sociale 2 ou Prénom ou Contact": "",
        "Adresse destinataire": order.shippingAddress?.address1 || "",
        "Adresse destinataire suite": order.shippingAddress?.address2 || "",
        "Digicode / Etage / Interphone": order.shippingAddress?.notes || "",
        "Code Postal destinataire": order.shippingAddress?.postalCode || "",
        "Ville Destinataire": order.shippingAddress?.city || "",
        "Code Pays destinataire": country,
        "Téléphone destinataire": normalizePhone(order.customer.phone),
        "Email destinataire": order.customer.email || "",
        "Référence envoi": order.reference,
        "Code barres client": "",
        Produit: chronopostProductCode(country),
        Compte: "",
        "Sous-compte": "",
        "Valeur assurée": "",
        "Valeur douane": "",
        "Document / marchandise": "M",
        "Description du contenu": order.items
          .map((item) => `${item.productTitle} x${item.quantity}`)
          .join(" | "),
        "Livraison le samedi": "N",
        "Identifiant Relais": "",
        Poids: computeChronopostWeight(order, products),
        Largueur: "",
        Longueur: "",
        Hauteur: "",
        "Avertir destinataire": "Y",
        "Nombre de colis": "1",
        "date d'envoi": formatShipDate(),
        "A intégrer": "Y",
        "Avertir expéditeur": "N",
      };
    });
}

export function toSemicolonCsv(rows: Record<string, string | number>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const bom = "\uFEFF";
  const lines = [headers.join(";")];

  for (const row of rows) {
    const values = headers.map(
      (header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`
    );
    lines.push(values.join(";"));
  }

  return `${bom}${lines.join("\n")}`;
}