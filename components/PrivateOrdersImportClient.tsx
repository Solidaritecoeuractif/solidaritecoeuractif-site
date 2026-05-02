"use client";

import { useMemo, useState } from "react";

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

type ParseResponse = {
  orders: ParsedPrivateOrder[];
  totalBlocks: number;
};

type CreateResponse = {
  createdCount: number;
  references: string[];
};

function sectionStyle() {
  return {
    border: "1px solid #dbe3ee",
    borderRadius: "16px",
    padding: "16px",
    background: "#ffffff",
  } as const;
}

function normalizeTextareaValue(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function PrivateOrdersImportClient() {
  const [rawText, setRawText] = useState("");
  const [parsedOrders, setParsedOrders] = useState<ParsedPrivateOrder[]>([]);
  const [busyParse, setBusyParse] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);
  const [parseError, setParseError] = useState("");
  const [createError, setCreateError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const normalizedText = useMemo(
    () => normalizeTextareaValue(rawText),
    [rawText]
  );

  const validOrders = useMemo(
    () => parsedOrders.filter((order) => order.errors.length === 0),
    [parsedOrders]
  );

  const invalidOrders = useMemo(
    () => parsedOrders.filter((order) => order.errors.length > 0),
    [parsedOrders]
  );

  async function analyzeText() {
    setParseError("");
    setCreateError("");
    setSuccessMessage("");
    setParsedOrders([]);

    if (!normalizedText) {
      setParseError("Merci de coller au moins une commande privée.");
      return;
    }

    setBusyParse(true);

    try {
      const response = await fetch("/api/admin/private-orders/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText: normalizedText,
        }),
      });

      const data = (await response.json()) as ParseResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Impossible d’analyser le copier-coller.");
      }

      setParsedOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      setParseError(
        error instanceof Error
          ? error.message
          : "Impossible d’analyser le copier-coller."
      );
    } finally {
      setBusyParse(false);
    }
  }

  async function createOrders() {
    setCreateError("");
    setSuccessMessage("");

    if (validOrders.length === 0) {
      setCreateError(
        "Aucune commande valide à créer. Corrigez d’abord les blocs en erreur."
      );
      return;
    }

    setBusyCreate(true);

    try {
      const response = await fetch("/api/admin/private-orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orders: validOrders,
        }),
      });

      const data = (await response.json()) as CreateResponse & { error?: string };

      if (!response.ok) {
        throw new Error(
          data.error || "Impossible de créer les commandes privées."
        );
      }

      const createdCount = Number(data.createdCount || 0);
      setSuccessMessage(
        createdCount > 0
          ? `${createdCount} commande(s) privée(s) créée(s) avec succès.`
          : "Création terminée."
      );

      setRawText("");
      setParsedOrders([]);
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "Impossible de créer les commandes privées."
      );
    } finally {
      setBusyCreate(false);
    }
  }

  return (
    <section className="panel table-wrap">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0 }}>Importer des commandes privées</h1>
        <div style={{ fontWeight: 600 }}>
          {parsedOrders.length} commande(s) analysée(s)
        </div>
      </div>

      <div style={{ ...sectionStyle(), marginBottom: "16px" }}>
        <p style={{ marginTop: 0 }}>
          Colle ici une ou plusieurs commandes privées, séparées par{" "}
          <strong>---</strong>.
        </p>

        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Nom : BOULANGER
Prénom : Justine
Adresse : 12 rue des Lilas
Complément : Bâtiment A
Code postal : 45000
Ville : Orléans
Pays : France
Téléphone : 0612345678
Email : justine@email.com
Produit : 365 jours avec le Seigneur Jésus-Christ
Quantité : 2

---
Nom : DUPONT
Prénom : Marie
Adresse : 8 avenue Victor Hugo
Complément :
Code postal :
Ville : Cotonou
Pays : Bénin
Téléphone : 22900000000
Email : marie@email.com
Produit : 365 jours avec le Seigneur Jésus-Christ
Quantité : 1`}
          style={{
            width: "100%",
            minHeight: "320px",
            marginTop: "12px",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="button secondary"
            onClick={analyzeText}
            disabled={busyParse || busyCreate}
          >
            {busyParse ? "Analyse en cours..." : "Analyser le copier-coller"}
          </button>

          <button
            type="button"
            className="button ghost"
            onClick={() => {
              setRawText("");
              setParsedOrders([]);
              setParseError("");
              setCreateError("");
              setSuccessMessage("");
            }}
            disabled={busyParse || busyCreate}
          >
            Réinitialiser
          </button>
        </div>

        {parseError ? (
          <p className="error-note" style={{ marginTop: "12px" }}>
            {parseError}
          </p>
        ) : null}

        {successMessage ? (
          <p className="success-note" style={{ marginTop: "12px" }}>
            {successMessage}
          </p>
        ) : null}

        {createError ? (
          <p className="error-note" style={{ marginTop: "12px" }}>
            {createError}
          </p>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ ...sectionStyle(), minWidth: "220px", flex: "1 1 220px" }}>
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>Valides</div>
          <div>{validOrders.length}</div>
        </div>

        <div style={{ ...sectionStyle(), minWidth: "220px", flex: "1 1 220px" }}>
          <div style={{ fontWeight: 700, marginBottom: "8px" }}>En erreur</div>
          <div>{invalidOrders.length}</div>
        </div>
      </div>

      {parsedOrders.length > 0 ? (
        <>
          <div style={{ ...sectionStyle(), marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 700 }}>Aperçu avant création</div>

              <button
                type="button"
                className="button primary"
                onClick={createOrders}
                disabled={busyCreate || validOrders.length === 0}
              >
                {busyCreate
                  ? "Création en cours..."
                  : "Créer les commandes valides"}
              </button>
            </div>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Adresse</th>
                <th>Code postal</th>
                <th>Ville</th>
                <th>Pays</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Produit</th>
                <th>Qté</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {parsedOrders.map((order) => {
                const ok = order.errors.length === 0;

                return (
                  <tr key={`${order.index}-${order.nom}-${order.prenom}`}>
                    <td>{order.index + 1}</td>
                    <td>{order.nom}</td>
                    <td>{order.prenom}</td>
                    <td>
                      {order.adresse}
                      {order.complement ? (
                        <>
                          <br />
                          <small>{order.complement}</small>
                        </>
                      ) : null}
                    </td>
                    <td>{order.codePostal}</td>
                    <td>{order.ville}</td>
                    <td>{order.pays}</td>
                    <td>{order.telephone}</td>
                    <td>{order.email}</td>
                    <td>{order.produit}</td>
                    <td>{order.quantite ?? ""}</td>
                    <td>
                      {ok ? (
                        <span className="badge paid">Valide</span>
                      ) : (
                        <div>
                          <span className="badge cancelled">Erreur</span>
                          <div style={{ marginTop: "6px" }}>
                            {order.errors.map((error, index) => (
                              <small
                                key={index}
                                style={{
                                  display: "block",
                                  color: "#9f1d1d",
                                  lineHeight: 1.4,
                                }}
                              >
                                {error}
                              </small>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}