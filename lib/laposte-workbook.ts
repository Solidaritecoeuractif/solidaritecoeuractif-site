import { deflateRawSync } from "node:zlib";
import type { LaPosteExport } from "./laposte-export";

// Petit générateur OOXML sans nouvelle dépendance. Valeurs figées : aucune formule,
// macro, liaison externe ou écriture de commandes en base. Compatible Excel et lecteur XLSX SCA.
const xml = (v: unknown) => String(v ?? "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const column = (i: number) => { let s = ""; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
const crcTable = Array.from({ length: 256 }, (_, i) => { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(data: Buffer) { let c = 0xffffffff; for (const b of data) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function archive(entries: Record<string, string>): Uint8Array {
  const local: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const n = Buffer.from(name, "utf8"), raw = Buffer.from(text, "utf8"), compressed = deflateRawSync(raw), crc = crc32(raw);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(33, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(compressed.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(n.length, 26);
    local.push(h, n, compressed);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(33, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(compressed.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    central.push(c, n); offset += h.length + n.length + compressed.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22), count = Object.keys(entries).length;
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, directory, end]));
}
const captions: Record<string, string> = {
  recipient_first_name: "Prénom", recipient_last_name: "Nom", recipient_company: "Société", recipient_address_line_1: "Numéro et rue", recipient_address_line_2: "Complément d'adresse", recipient_postal_code: "Code postal (texte)", recipient_city: "Ville", recipient_country_iso_code: "Pays ISO", recipient_additional_information: "Consignes de livraison", recipient_phone: "Téléphone avec indicatif (texte)", recipient_email: "E-mail", recipient_proximity_point: "Code point relais", package_1_weight: "Poids du colis emballé en kg", package_1_length: "Longueur extérieure en cm", package_1_width: "Largeur extérieure en cm", package_1_height: "Hauteur extérieure en cm", package_1_value: "Valeur totale des marchandises (EUR)", external_reference: "Référence SCA", reason: "Raison : OTHR = Autre", article_1_description: "Description douanière", article_1_quantity: "Nombre d'articles", article_1_unit_weight: "Poids net d'un article en kg", article_1_unit_price: "Valeur douanière d'un article en EUR", article_1_country_of_origin_code: "Pays de fabrication / origine", article_1_tariff_number: "Numéro tarifaire SH (texte)",
};
export async function laPosteWorkbook(data: LaPosteExport): Promise<Uint8Array> {
  if (data.issues.length || !data.rows.length) throw new Error("Export non valide.");
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const rowXml = (values: (string | number)[], index: number, headers: string[] = []) => `<row r="${index + 1}" ht="${index === 0 ? 48 : 34}" customHeight="1">${values.map((v, c) => {
    const address = `${column(c)}${index + 1}`;
    const style = index === 0 ? 1 : typeof v === "number" ? headers[c]?.includes("weight") ? 3 : headers[c]?.includes("price") || headers[c]?.endsWith("value") ? 4 : 5 : 2;
    if (typeof v === "number") { if (!Number.isFinite(v)) throw new Error("Nombre non fini dans le fichier."); return `<c r="${address}" s="${style}"><v>${v}</v></c>`; }
    return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join("")}</row>`;
  const last = column(data.headers.length - 1), dimension = `A1:${last}${data.rows.length + 1}`;
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${ns}"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="34"/><cols>${data.headers.map((h, i) => `<col min="${i + 1}" max="${i + 1}" width="${h.includes("address") || h === "external_reference" ? 32 : h.includes("phone") || h.includes("email") ? 28 : 24}" customWidth="1"/>`).join("")}</cols><sheetData>${rowXml(data.headers, 0)}${data.rows.map((row, i) => rowXml(data.headers.map(h => row[h] ?? ""), i + 1, data.headers)).join("")}</sheetData><autoFilter ref="${dimension}"/></worksheet>`;
  const instructions: string[][] = [
    ["MODE D'EMPLOI", "SCA → La Poste Pro Expéditions"],
    ["Fichier", `${data.rows.length} commande(s), ${data.headers.length} colonnes officielles. Aucune ligne d'instructions dans les données.`],
    ["Utiliser", "Chargez le fichier dans l'Assistant v1.16, vérifiez puis injectez. Les poids et valeurs sont conservés."],
    ["Modifier", "Modifiez uniquement la feuille Envois La Poste. Conservez téléphones, références et codes postaux en texte."],
    ["Profil", data.customs ? "Modèle complet avec douane : champs douaniers vides sur les lignes sans douane." : "Modèle simple (18 colonnes). Dans La Poste, conserver Livre imprimé / Livres comme contenu par défaut."],
    ["Poids", "Barème local : 1 livre 0,555 kg ; 2 : 1,155 ; 3 : 1,685 ; 4 : 2,215 ; 5 : 2,850 ; 6 : 3,430 ; 7 : 3,960. À vérifier lors d'un changement d'emballage."],
    ["Douane livre 365", "Poids net 0,530 kg/livre ; valeur douanière 10 EUR/livre ; origine FR ; SH 490199 ; raison OTHR. Vérifier le contenu réel."],
    ["Dimensions", "1 livre : 25×18×4 cm ; 2–4 : 23×16×8 ; 5–7 : 25×20×15. Formats non définis au-delà de 7."],
    ["Destinations mixtes", data.mixed ? "Toute la sélection est conservée. L'acceptation définitive du fichier mixte reste à vérifier dans La Poste." : "Ce lot ne mélange pas les profils douaniers."],
    ["Attention", "Ce téléchargement ne crée pas d'affranchissement, ne modifie pas les commandes et ne déclenche pas de paiement. Ne pas réacheter un envoi existant."],
    ["Colonnes officielles", "Traduction pour lecture (ne pas renommer les en-têtes de la première feuille)"],
    ...data.headers.map(h => [h, captions[h] || h]),
  ];
  const guide = `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="34"/><cols><col min="1" max="1" width="35" customWidth="1"/><col min="2" max="2" width="98" customWidth="1"/></cols><sheetData>${instructions.map((r,i)=>rowXml(r,i)).join("")}</sheetData></worksheet>`;
  const alignment = '<alignment vertical="center" wrapText="1"/>';
  const xf = (numFmtId: number, fontId: number, fillId: number) => `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1" applyFont="1" applyFill="1">${alignment}</xf>`;
  const styles = `<?xml version="1.0"?><styleSheet xmlns="${ns}"><numFmts count="1"><numFmt numFmtId="164" formatCode="0.000"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF293C77"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6">${xf(0,0,0)}${xf(49,1,2)}${xf(49,0,0)}${xf(164,0,0)}${xf(2,0,0)}${xf(1,0,0)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return archive({
    "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Envois La Poste" sheetId="1" r:id="rId1"/><sheet name="Mode d'emploi" sheetId="2" r:id="rId2"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    "xl/styles.xml": styles, "xl/worksheets/sheet1.xml": sheet, "xl/worksheets/sheet2.xml": guide,
  });
}
