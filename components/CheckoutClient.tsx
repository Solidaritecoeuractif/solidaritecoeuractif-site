"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { euros } from "@/lib/utils";

const COUNTRY_OPTIONS = [
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
  { code: "FR", label: "France" },
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

const FORCED_POSTAL_CODES: Record<string, string> = {
  AE: "00000",
  AG: "00000",
  AN: "00000",
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
  CK: "00000",
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
  TF: "00000",
  TG: "00000",
  TK: "00000",
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

type ClientItem = { productId: string; quantity: number; customAmount?: number };

type Quote = {
  subtotalAmount: number;
  shippingAmount: number;
  totalAmount: number;
};

export function CheckoutClient({ products }: { products: Product[] }) {
  const [items, setItems] = useState<ClientItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "FR",
    address1: "",
    address2: "",
    postalCode: "",
    city: "",
    notes: ""
  });

  const forcedPostalCode = FORCED_POSTAL_CODES[form.country] || "";
  const isPostalCodeForced = Boolean(forcedPostalCode);

  useEffect(() => {
    setForm((prev) => {
      if (forcedPostalCode) {
        if (prev.postalCode === forcedPostalCode) return prev;
        return { ...prev, postalCode: forcedPostalCode };
      }

      if (prev.postalCode === "00000") {
        return { ...prev, postalCode: "" };
      }

      return prev;
    });
  }, [forcedPostalCode]);

  useEffect(() => {
    const raw = localStorage.getItem("sca_cart");
    setItems(raw ? JSON.parse(raw) : []);
  }, []);

  const resolved = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId && entry.isActive);
        if (!product) return null;
        const unit =
          product.pricingMode === "fixed"
            ? product.fixedPrice || 0
            : Math.max(item.customAmount || 0, product.minimumAmount || 0);
        return { ...item, product, unit, total: unit * item.quantity };
      })
      .filter(Boolean);
  }, [items, products]);

  const requiresShipping = resolved.some(
    (item: any) => item.product.requiresShipping && item.product.isPhysical
  );

  useEffect(() => {
    async function refreshQuote() {
      if (!items.length) {
        setQuote(null);
        return;
      }
      setQuoting(true);
      try {
        const response = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            country: requiresShipping ? form.country : undefined
          })
        });
        const data = await response.json();
        if (response.ok) {
          setQuote(data);
        }
      } finally {
        setQuoting(false);
      }
    }

    refreshQuote();
  }, [items, form.country, requiresShipping]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone
          },
          shippingAddress: requiresShipping
            ? {
                country: form.country,
                address1: form.address1,
                address2: form.address2,
                postalCode: form.postalCode,
                city: form.city,
                notes: form.notes
              }
            : undefined
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Erreur de checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="checkout-layout">
      <form onSubmit={submit} className="panel">
        <h1>Finaliser la commande</h1>
        <div className="form-grid">
          <label>
            <span>Prénom</span>
            <input required value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
          </label>
          <label>
            <span>Nom</span>
            <input required value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
          </label>
          <label>
            <span>Téléphone</span>
            <input required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </label>
        </div>

        {requiresShipping ? (
          <>
            <h2>Adresse de livraison</h2>
            <div className="form-grid">
              <label>
                <span>Pays</span>
                <select value={form.country} onChange={(e) => update("country", e.target.value)}>
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Adresse</span>
                <input required value={form.address1} onChange={(e) => update("address1", e.target.value)} />
              </label>

              <label>
                <span>Complément</span>
                <input value={form.address2} onChange={(e) => update("address2", e.target.value)} />
              </label>

              <label>
                <span>Code postal</span>
                <input
                  required
                  value={form.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                  readOnly={isPostalCodeForced}
                  style={
                    isPostalCodeForced
                      ? {
                          background: "#f1f5f9",
                          color: "#64748b",
                          cursor: "not-allowed"
                        }
                      : undefined
                  }
                />
                {isPostalCodeForced ? (
                  <p style={{ marginTop: "8px", fontSize: "14px", color: "#64748b" }}>
                    Code postal rempli automatiquement pour ce pays : {forcedPostalCode}
                  </p>
                ) : null}
              </label>

              <label>
                <span>Ville</span>
                <input required value={form.city} onChange={(e) => update("city", e.target.value)} />
              </label>

              <label className="full">
                <span>Notes de livraison</span>
                <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} />
              </label>
            </div>
          </>
        ) : null}

        {error ? <p className="error-note">{error}</p> : null}

        <button className="button primary" type="submit" disabled={loading || resolved.length === 0}>
          {loading ? "Redirection..." : "Payer avec Stripe"}
        </button>
      </form>

      <div className="panel summary-panel">
        <h2>Votre commande</h2>
        {resolved.map((item: any, index: number) => (
          <div key={index} className="summary-row">
            <span>
              {item.product.title} x{item.quantity}
            </span>
            <strong>{euros(item.total)}</strong>
          </div>
        ))}
        <div className="summary-row">
          <span>Sous-total</span>
          <strong>{euros(quote?.subtotalAmount || 0)}</strong>
        </div>
        <div className="summary-row">
          <span>Livraison</span>
          <strong>{quoting ? "Calcul..." : euros(quote?.shippingAmount || 0)}</strong>
        </div>
        <div className="summary-row total">
          <span>Total</span>
          <strong>{euros(quote?.totalAmount || 0)}</strong>
        </div>
        <p>
          Les données client et livraison sont enregistrées d’abord dans la commande interne du site,
          puis Stripe sert à confirmer le paiement.
        </p>
      </div>
    </div>
  );
}