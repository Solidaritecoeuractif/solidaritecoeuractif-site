import type { Order } from "@/lib/types";
import { LAPOSTE_SETTINGS as S } from "./laposte-settings";
import { normalizeLaPostePhone } from "./laposte-phone.cjs";


// Colonnes exactes des deux modèles La Poste fournis, sans ligne d'instructions.
export const LAPOSTE_BASE_HEADERS = [
  "recipient_first_name", "recipient_last_name", "recipient_company",
  "recipient_address_line_1", "recipient_address_line_2", "recipient_postal_code",
  "recipient_city", "recipient_country_iso_code", "recipient_additional_information",
  "recipient_phone", "recipient_email", "recipient_proximity_point", "package_1_weight",
  "package_1_length", "package_1_width", "package_1_height", "package_1_value", "external_reference",
] as const;
export const LAPOSTE_CUSTOMS_HEADERS = ["reason", "article_1_description", "article_1_quantity", "article_1_unit_weight", "article_1_unit_price", "article_1_country_of_origin_code", "article_1_tariff_number"] as const;
export type LaPosteRow = Record<string, string | number>;
export type LaPosteIssue = { reference: string; name: string; field: string; message: string };
export type LaPostePreview = { reference: string; name: string; country: string; quantity: number; phoneOriginal: string; phone: string; phoneNote: string; weight: number | null; dimensions: string; value: number; customs: boolean | null; alreadyShipped: boolean };
export type LaPosteExport = { headers: string[]; rows: LaPosteRow[]; preview: LaPostePreview[]; issues: LaPosteIssue[]; customs: boolean; mixed: boolean };
const text = (v: unknown) => String(v ?? "").trim();
const ISO_CODES=new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
const EU = new Set("AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(" "));
export function laPosteCountry(code: unknown) {
  const value = text(code).toUpperCase();
  const aliases: Record<string, string> = { "FRANCE": "FR", "FRANCE METROPOLITAINE": "FR", "UK": "GB", "USA": "US" };
  const match = value.match(/^FR-(MQ|GP|GF|RE|YT|BL|MF|PM|NC|PF|WF)$/);
  return match ? match[1] : aliases[value] || value;
}
/** Les cas territoriaux particuliers sont signalés, pas assimilés silencieusement à leur État. */
export function laPosteNeedsCustoms(country: string, postal: string, city: string): boolean | null {
  if (!ISO_CODES.has(country)) return null;
  const cp = postal.replace(/\s/g, "");
  if (country === "FR" && /^(97|98)/.test(cp)) return null;
  if (["MC", "AD", "SM"].includes(country)) return null;
  if (country === "GB" && /^BT/i.test(cp)) return null;
  if (country === "ES" && /^(35|38|51|52)/.test(cp)) return null;
  if (country === "FI" && /^22/.test(cp)) return null;
  if (country === "DE" && /^(27498|78266)$/.test(cp)) return null;
  if (country === "IT" && /^(23041|22061)$/.test(cp)) return null;
  if (country === "GR" && /athos|agion oros/i.test(city)) return null;
  return !EU.has(country);
}
export function prepareLaPosteExport(orders: Order[]): LaPosteExport {
  const issues: LaPosteIssue[] = [], rows: LaPosteRow[] = [], preview: LaPostePreview[] = [];
  const seen = new Set<string>();
  for (const order of orders) {
    const ref = text(order.reference), name = [text(order.customer?.firstName), text(order.customer?.lastName)].join(" ").trim();
    const issue = (field: string, message: string) => issues.push({ reference: ref, name, field, message });
    if (!ref || seen.has(ref)) issue("Référence", "Référence manquante ou dupliquée ; aucune sélection partielle ne sera exportée.");
    seen.add(ref);
    if (order.paymentStatus !== "paid") issue("Paiement", "Cette commande n'est pas payée.");
    if (order.logisticsStatus === "cancelled") issue("Logistique", "Commande annulée.");
    const address = order.shippingAddress;
    if (!address) issue("Adresse", "Adresse de livraison manquante.");
    const country = laPosteCountry(address?.country), postal = text(address?.postalCode), city = text(address?.city);
    const first = text(order.customer?.firstName), last = text(order.customer?.lastName);
    if (!first || !last) issue("Identité", "Prénom et nom doivent être renseignés séparément.");
    if (!text(address?.address1)) issue("Adresse", "Adresse principale manquante.");
    if (/^\d+\s*(bis|ter|quater)?$/i.test(text(address?.address1))) issue("Adresse", "La première ligne ne contient que le numéro. Regrouper numéro et rue dans l'adresse principale.");
    if (!city) issue("Ville", "Ville manquante.");
    const customs = laPosteNeedsCustoms(country, postal, city);
    if (customs === null) issue("Destination", "Pays ou régime territorial à vérifier : " + (country || "vide") + ".");
    const postalPatterns: Record<string, RegExp> = { FR: /^\d{5}$/, MQ: /^972\d{2}$/, GP: /^971\d{2}$/, GF: /^973\d{2}$/, RE: /^974\d{2}$/, YT: /^976\d{2}$/, DE: /^\d{5}$/, IT: /^\d{5}$/, BE: /^\d{4}$/, CH: /^\d{4}$/, US: /^\d{5}(?:-\d{4})?$/, CA: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/i };
    if (postalPatterns[country] && !postalPatterns[country].test(postal.replace(/\s/g, ""))) issue("Code postal", "Format de code postal à vérifier pour " + country + ".");
    const email = text(order.customer?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issue("E-mail", "E-mail manquant ou invalide.");
    const phone = normalizeLaPostePhone(order.customer?.phone, country);
    if (phone.error) issue("Téléphone", phone.error);
    const items = order.items || [];
    const quantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    if (!items.length || items.some(i => !Number.isInteger(i.quantity) || i.quantity < 1) || !Number.isInteger(quantity) || quantity < 1) issue("Quantité", "Quantité entière positive requise.");
    if (items.some(i => !/(?:livre.*365|365\s+jours.*seigneur)/i.test(text(i.productTitle)))) issue("Produit", "Les poids et la valeur configurés concernent le livre 365. Paramétrer tout autre produit avant export.");
    const pack = S.packaging[quantity];
    if (!pack) issue("Emballage", "Emballage non défini pour " + quantity + " livre(s) : format confirmé jusqu'à 7 livres.");
    const value = Number.isFinite(quantity) ? quantity * S.unitCustomsValueEur : 0;
    if (pack && pack.weight + 1e-9 < quantity * S.unitWeightKg) issue("Poids", "Poids emballé inférieur au poids net des articles.");
    const row: LaPosteRow = {
      recipient_first_name: first, recipient_last_name: last, recipient_company: "",
      recipient_address_line_1: text(address?.address1), recipient_address_line_2: text(address?.address2),
      recipient_postal_code: postal, recipient_city: city, recipient_country_iso_code: country,
      recipient_additional_information: text(address?.notes), recipient_phone: phone.value,
      recipient_email: email, recipient_proximity_point: "",
      package_1_weight: pack?.weight ?? "", package_1_length: pack?.length ?? "", package_1_width: pack?.width ?? "",
      package_1_height: pack?.height ?? "", package_1_value: value, external_reference: ref,
    };
    if (customs === true) Object.assign(row, { reason: S.reason, article_1_description: S.description,
      article_1_quantity: quantity, article_1_unit_weight: S.unitWeightKg, article_1_unit_price: S.unitCustomsValueEur,
      article_1_country_of_origin_code: S.countryOfOrigin, article_1_tariff_number: S.tariffNumber });
    rows.push(row);
    preview.push({ reference: ref, name, country, quantity, phoneOriginal: phone.original, phone: phone.value, phoneNote: phone.note,
      weight: pack?.weight ?? null, dimensions: pack ? `${pack.length} × ${pack.width} × ${pack.height}` : "À définir",
      value, customs, alreadyShipped: ["shipped", "delivered"].includes(order.logisticsStatus) });
  }
  const customs = preview.some(p => p.customs === true);
  return { headers: [...LAPOSTE_BASE_HEADERS, ...(customs ? LAPOSTE_CUSTOMS_HEADERS : [])], rows, preview, issues, customs, mixed: customs && preview.some(p => p.customs === false) };
}
