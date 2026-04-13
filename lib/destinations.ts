export type DestinationZone =
  | "france_metropolitaine"
  | "outre_mer"
  | "afrique"
  | "international";

export type DestinationOption = {
  code: string;
  label: string;
  zone: DestinationZone;
  countryCode: string;
};

const OVERSEAS_OPTIONS: DestinationOption[] = [
  { code: "FR-GP", label: "France / Guadeloupe", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-MQ", label: "France / Martinique", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-GF", label: "France / Guyane", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-RE", label: "France / La Réunion", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-YT", label: "France / Mayotte", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-BL", label: "France / Saint-Barthélemy", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-MF", label: "France / Saint-Martin", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-PM", label: "France / Saint-Pierre-et-Miquelon", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-WF", label: "France / Wallis-et-Futuna", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-PF", label: "France / Polynésie française", zone: "outre_mer", countryCode: "FR" },
  { code: "FR-NC", label: "France / Nouvelle-Calédonie", zone: "outre_mer", countryCode: "FR" },
];

const AFRICA_CODES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG",
  "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN",
  "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ",
  "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
  "TZ", "TG", "TN", "UG", "ZM", "ZW"
]);

const REST_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "AF", label: "Afghanistan" },
  { code: "ZA", label: "Afrique du Sud" },
  { code: "AL", label: "Albanie" },
  { code: "DZ", label: "Algérie" },
  { code: "DE", label: "Allemagne" },
  { code: "AD", label: "Andorre" },
  { code: "AO", label: "Angola" },
  { code: "AG", label: "Antigua-et-Barbuda" },
  { code: "SA", label: "Arabie saoudite" },
  { code: "AR", label: "Argentine" },
  { code: "AM", label: "Arménie" },
  { code: "AU", label: "Australie" },
  { code: "AT", label: "Autriche" },
  { code: "AZ", label: "Azerbaïdjan" },
  { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahreïn" },
  { code: "BD", label: "Bangladesh" },
  { code: "BB", label: "Barbade" },
  { code: "BE", label: "Belgique" },
  { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Bénin" },
  { code: "BT", label: "Bhoutan" },
  { code: "BY", label: "Biélorussie" },
  { code: "MM", label: "Birmanie" },
  { code: "BO", label: "Bolivie" },
  { code: "BA", label: "Bosnie-Herzégovine" },
  { code: "BW", label: "Botswana" },
  { code: "BR", label: "Brésil" },
  { code: "BN", label: "Brunéi" },
  { code: "BG", label: "Bulgarie" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "KH", label: "Cambodge" },
  { code: "CM", label: "Cameroun" },
  { code: "CA", label: "Canada" },
  { code: "CV", label: "Cap-Vert" },
  { code: "CF", label: "République centrafricaine" },
  { code: "CL", label: "Chili" },
  { code: "CN", label: "Chine" },
  { code: "CY", label: "Chypre" },
  { code: "CO", label: "Colombie" },
  { code: "KM", label: "Comores" },
  { code: "CG", label: "Congo-Brazzaville" },
  { code: "CD", label: "Congo-Kinshasa" },
  { code: "KP", label: "Corée du Nord" },
  { code: "KR", label: "Corée du Sud" },
  { code: "CR", label: "Costa Rica" },
  { code: "CI", label: "Côte d’Ivoire" },
  { code: "HR", label: "Croatie" },
  { code: "CU", label: "Cuba" },
  { code: "DK", label: "Danemark" },
  { code: "DJ", label: "Djibouti" },
  { code: "DM", label: "Dominique" },
  { code: "EG", label: "Égypte" },
  { code: "AE", label: "Émirats arabes unis" },
  { code: "EC", label: "Équateur" },
  { code: "ER", label: "Érythrée" },
  { code: "ES", label: "Espagne" },
  { code: "EE", label: "Estonie" },
  { code: "US", label: "États-Unis" },
  { code: "SZ", label: "Eswatini" },
  { code: "ET", label: "Éthiopie" },
  { code: "FJ", label: "Fidji" },
  { code: "FI", label: "Finlande" },
  { code: "GA", label: "Gabon" },
  { code: "GM", label: "Gambie" },
  { code: "GE", label: "Géorgie" },
  { code: "GH", label: "Ghana" },
  { code: "GR", label: "Grèce" },
  { code: "GD", label: "Grenade" },
  { code: "GT", label: "Guatemala" },
  { code: "GN", label: "Guinée" },
  { code: "GQ", label: "Guinée équatoriale" },
  { code: "GW", label: "Guinée-Bissau" },
  { code: "GY", label: "Guyana" },
  { code: "HT", label: "Haïti" },
  { code: "HN", label: "Honduras" },
  { code: "HU", label: "Hongrie" },
  { code: "IN", label: "Inde" },
  { code: "ID", label: "Indonésie" },
  { code: "IQ", label: "Irak" },
  { code: "IR", label: "Iran" },
  { code: "IE", label: "Irlande" },
  { code: "IS", label: "Islande" },
  { code: "IL", label: "Israël" },
  { code: "IT", label: "Italie" },
  { code: "JM", label: "Jamaïque" },
  { code: "JP", label: "Japon" },
  { code: "JO", label: "Jordanie" },
  { code: "KZ", label: "Kazakhstan" },
  { code: "KE", label: "Kenya" },
  { code: "KG", label: "Kirghizistan" },
  { code: "KI", label: "Kiribati" },
  { code: "KW", label: "Koweït" },
  { code: "LA", label: "Laos" },
  { code: "LS", label: "Lesotho" },
  { code: "LV", label: "Lettonie" },
  { code: "LB", label: "Liban" },
  { code: "LR", label: "Libéria" },
  { code: "LY", label: "Libye" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Lituanie" },
  { code: "LU", label: "Luxembourg" },
  { code: "MK", label: "Macédoine du Nord" },
  { code: "MG", label: "Madagascar" },
  { code: "MY", label: "Malaisie" },
  { code: "MW", label: "Malawi" },
  { code: "MV", label: "Maldives" },
  { code: "ML", label: "Mali" },
  { code: "MT", label: "Malte" },
  { code: "MA", label: "Maroc" },
  { code: "MH", label: "Îles Marshall" },
  { code: "MU", label: "Maurice" },
  { code: "MR", label: "Mauritanie" },
  { code: "MX", label: "Mexique" },
  { code: "FM", label: "Micronésie" },
  { code: "MD", label: "Moldavie" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolie" },
  { code: "ME", label: "Monténégro" },
  { code: "MZ", label: "Mozambique" },
  { code: "NA", label: "Namibie" },
  { code: "NR", label: "Nauru" },
  { code: "NP", label: "Népal" },
  { code: "NI", label: "Nicaragua" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "NO", label: "Norvège" },
  { code: "NZ", label: "Nouvelle-Zélande" },
  { code: "OM", label: "Oman" },
  { code: "UG", label: "Ouganda" },
  { code: "UZ", label: "Ouzbékistan" },
  { code: "PK", label: "Pakistan" },
  { code: "PW", label: "Palaos" },
  { code: "PS", label: "Palestine" },
  { code: "PA", label: "Panama" },
  { code: "PG", label: "Papouasie-Nouvelle-Guinée" },
  { code: "PY", label: "Paraguay" },
  { code: "NL", label: "Pays-Bas" },
  { code: "PE", label: "Pérou" },
  { code: "PH", label: "Philippines" },
  { code: "PL", label: "Pologne" },
  { code: "PT", label: "Portugal" },
  { code: "QA", label: "Qatar" },
  { code: "DO", label: "République dominicaine" },
  { code: "CZ", label: "Tchéquie" },
  { code: "RO", label: "Roumanie" },
  { code: "GB", label: "Royaume-Uni" },
  { code: "RU", label: "Russie" },
  { code: "RW", label: "Rwanda" },
  { code: "KN", label: "Saint-Christophe-et-Niévès" },
  { code: "SM", label: "Saint-Marin" },
  { code: "VC", label: "Saint-Vincent-et-les-Grenadines" },
  { code: "LC", label: "Sainte-Lucie" },
  { code: "SB", label: "Îles Salomon" },
  { code: "SV", label: "Salvador" },
  { code: "WS", label: "Samoa" },
  { code: "ST", label: "Sao Tomé-et-Principe" },
  { code: "SN", label: "Sénégal" },
  { code: "RS", label: "Serbie" },
  { code: "SC", label: "Seychelles" },
  { code: "SL", label: "Sierra Leone" },
  { code: "SG", label: "Singapour" },
  { code: "SK", label: "Slovaquie" },
  { code: "SI", label: "Slovénie" },
  { code: "SO", label: "Somalie" },
  { code: "SD", label: "Soudan" },
  { code: "SS", label: "Soudan du Sud" },
  { code: "LK", label: "Sri Lanka" },
  { code: "SE", label: "Suède" },
  { code: "CH", label: "Suisse" },
  { code: "SR", label: "Suriname" },
  { code: "SY", label: "Syrie" },
  { code: "TJ", label: "Tadjikistan" },
  { code: "TZ", label: "Tanzanie" },
  { code: "TD", label: "Tchad" },
  { code: "TH", label: "Thaïlande" },
  { code: "TL", label: "Timor oriental" },
  { code: "TG", label: "Togo" },
  { code: "TO", label: "Tonga" },
  { code: "TT", label: "Trinité-et-Tobago" },
  { code: "TN", label: "Tunisie" },
  { code: "TM", label: "Turkménistan" },
  { code: "TR", label: "Turquie" },
  { code: "TV", label: "Tuvalu" },
  { code: "UA", label: "Ukraine" },
  { code: "UY", label: "Uruguay" },
  { code: "VU", label: "Vanuatu" },
  { code: "VA", label: "Vatican" },
  { code: "VE", label: "Venezuela" },
  { code: "VN", label: "Viêt Nam" },
  { code: "YE", label: "Yémen" },
  { code: "ZM", label: "Zambie" },
  { code: "ZW", label: "Zimbabwe" },
];

export const DESTINATION_OPTIONS: DestinationOption[] = [
  { code: "FR", label: "France", zone: "france_metropolitaine", countryCode: "FR" },
  ...OVERSEAS_OPTIONS,
  ...REST_OPTIONS.map(
    (item): DestinationOption => ({
      code: item.code,
      label: item.label,
      zone: AFRICA_CODES.has(item.code) ? "afrique" : "international",
      countryCode: item.code,
    })
  ),
];

export const FORCED_POSTAL_CODES: Record<string, string> = {
  AE: "00000",
  AG: "00000",
  AO: "00000",
  AW: "00000",
  BF: "00000",
  BI: "00000",
  BJ: "00000",
  BO: "00000",
  BS: "00000",
  BW: "00000",
  BZ: "00000",
  CD: "00000",
  CF: "00000",
  CG: "00000",
  CI: "00000",
  CM: "00000",
  DJ: "00000",
  DM: "00000",
  ER: "00000",
  FJ: "00000",
  GD: "00000",
  GH: "00000",
  GM: "00000",
  GN: "00000",
  GQ: "00000",
  GW: "00000",
  GY: "00000",
  HK: "00000",
  IE: "00000",
  JM: "00000",
  KE: "00000",
  KI: "00000",
  KM: "00000",
  KN: "00000",
  KP: "00000",
  LC: "00000",
  ML: "00000",
  MO: "00000",
  MR: "00000",
  MS: "00000",
  MU: "00000",
  MW: "00000",
  NA: "00000",
  NR: "00000",
  NU: "00000",
  PA: "00000",
  QA: "00000",
  RW: "00000",
  SB: "00000",
  SC: "00000",
  SL: "00000",
  SO: "00000",
  SR: "00000",
  ST: "00000",
  SY: "00000",
  TG: "00000",
  TO: "00000",
  TT: "00000",
  TV: "00000",
  TZ: "00000",
  UG: "00000",
  VU: "00000",
  WS: "00000",
  YE: "00000",
  ZW: "00000",
};

export function getDestinationZone(code: string): DestinationZone {
  return (
    DESTINATION_OPTIONS.find((item) => item.code === code)?.zone ||
    "international"
  );
}

export function getDestinationCountryCode(code: string) {
  return (
    DESTINATION_OPTIONS.find((item) => item.code === code)?.countryCode || code
  );
}

export function getDestinationMultiplier(code: string) {
  const zone = getDestinationZone(code);
  if (zone === "france_metropolitaine") return 1;
  if (zone === "outre_mer") return 1.66;
  return 3;
}

export function roundUpToUpperEuro(amountInCents: number) {
  return Math.ceil(amountInCents / 100) * 100;
}

export function calculateZoneAdjustedLineMinimum(
  baseUnitAmount: number,
  quantity: number,
  destinationCode: string
) {
  const multiplier = getDestinationMultiplier(destinationCode);
  const raw = baseUnitAmount * quantity * multiplier;
  return roundUpToUpperEuro(raw);
}

export function isOverseasDestination(code: string) {
  return getDestinationZone(code) === "outre_mer";
}

export function isAfricaDestination(code: string) {
  return getDestinationZone(code) === "afrique";
}