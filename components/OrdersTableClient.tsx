"use client";

import { useMemo, useState } from "react";
import { euros } from "@/lib/utils";
import {
  getDestinationZone,
  isAfricaDestination,
  isOverseasDestination,
} from "@/lib/destinations";

type OrderItem = {
  productTitle: string;
  quantity: number;
};

type Order = {
  reference: string;
  createdAt: string;
  updatedAt: string;
  exportedAt?: string;
  totalAmount: number;
  paymentStatus: string;
  logisticsStatus: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  shippingAddress?: {
    country?: string;
    city?: string;
    postalCode?: string;
    address1?: string;
    address2?: string;
    notes?: string;
  };
  items: OrderItem[];
};

function badgeClass(status: string) {
  if (status === "paid" || status === "delivered") return `badge ${status}`;
  if (status === "to_process") return `badge ${status}`;
  return "badge cancelled";
}

function paymentLabel() {
  return "Payé";
}

function logisticsLabel(status: string) {
  if (status === "to_process") return "À traiter";
  if (status === "prepared") return "Préparé";
  if (status === "shipped") return "Expédié";
  if (status === "delivered") return "Livré";
  return status;
}

function exportLabel(order: Order) {
  return order.exportedAt ? "Exportée" : "Non exportée";
}

function exportBadgeClass(order: Order) {
  return order.exportedAt ? "badge paid" : "badge pending";
}

function toDateTimeLocalValue(iso: string) {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function zoneLabel(countryCode?: string) {
  if (!countryCode) return "Sans adresse";

  const zone = getDestinationZone(countryCode);

  if (zone === "france_metropolitaine") return "France métro.";
  if (zone === "outre_mer") return "Outre-Mer";
  if (zone === "afrique") return "Afrique";
  return "International";
}

function isInternationalCustomsEligible(countryCode?: string) {
  const zone = getDestinationZone(countryCode || "");
  return (
    zone === "outre_mer" ||
    zone === "afrique" ||
    zone === "international"
  );
}

function normalizeSearchText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function sectionCardStyle() {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
    background: "#ffffff",
    minWidth: "260px",
    flex: "1 1 260px",
  } as const;
}

function sectionTitleStyle() {
  return {
    fontSize: "14px",
    fontWeight: 700,
    marginBottom: "10px",
  } as const;
}

const headerCellStyle = {
  padding: "8px 6px",
  fontSize: "12px",
  lineHeight: 1.2,
  whiteSpace: "nowrap" as const,
  verticalAlign: "middle" as const,
};

const bodyCellStyle = {
  padding: "9px 6px",
  verticalAlign: "top" as const,
  fontSize: "12px",
  lineHeight: 1.3,
};

const compactTextStyle = {
  overflowWrap: "anywhere" as const,
  wordBreak: "break-word" as const,
};

const mutedSmallStyle = {
  fontSize: "11px",
  lineHeight: 1.25,
  color: "#64748b",
};

const compactBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "24px",
  padding: "4px 7px",
  fontSize: "11px",
  lineHeight: 1,
  whiteSpace: "nowrap" as const,
};

export default function OrdersTableClient({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [logisticsFilter, setLogisticsFilter] = useState("all");
  const [exportFilter, setExportFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingReference, setDeletingReference] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return orders.filter((order) => {
      const logisticsOk =
        logisticsFilter === "all"
          ? true
          : order.logisticsStatus === logisticsFilter;

      const exportOk =
        exportFilter === "all"
          ? true
          : exportFilter === "exported"
            ? Boolean(order.exportedAt)
            : !order.exportedAt;

      const orderDate = new Date(order.createdAt).getTime();
      const fromOk = dateFrom ? orderDate >= new Date(dateFrom).getTime() : true;
      const toOk = dateTo ? orderDate <= new Date(dateTo).getTime() : true;

      const countryCode = order.shippingAddress?.country || "";
      const zone = getDestinationZone(countryCode);

      const zoneOk =
        zoneFilter === "all"
          ? true
          : zoneFilter === "overseas"
            ? zone === "outre_mer"
            : zoneFilter === "africa"
              ? zone === "afrique"
              : zoneFilter === "international"
                ? zone === "international"
                : zoneFilter === "france"
                  ? zone === "france_metropolitaine"
                  : true;

      const searchSource = normalizeSearchText(
        [
          order.reference,
          order.customer.firstName,
          order.customer.lastName,
          order.customer.email,
          order.customer.phone,
        ].join(" ")
      );

      const searchOk =
        normalizedSearch === "" || searchSource.includes(normalizedSearch);

      return logisticsOk && exportOk && fromOk && toOk && zoneOk && searchOk;
    });
  }, [
    orders,
    logisticsFilter,
    exportFilter,
    zoneFilter,
    dateFrom,
    dateTo,
    searchTerm,
  ]);

  const allVisibleSelected = useMemo(() => {
    return (
      filteredOrders.length > 0 &&
      filteredOrders.every((order) => selected.includes(order.reference))
    );
  }, [filteredOrders, selected]);

  function toggleOne(reference: string) {
    setSelected((prev) =>
      prev.includes(reference)
        ? prev.filter((item) => item !== reference)
        : [...prev, reference]
    );
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected((prev) =>
        prev.filter(
          (reference) =>
            !filteredOrders.some((order) => order.reference === reference)
        )
      );
      return;
    }

    const visibleRefs = filteredOrders.map((order) => order.reference);
    setSelected((prev) => Array.from(new Set([...prev, ...visibleRefs])));
  }

  function selectByPredicate(predicate: (order: Order) => boolean) {
    const refs = filteredOrders.filter(predicate).map((order) => order.reference);
    setSelected(refs);
  }

  function selectAllVisible() {
    setSelected(filteredOrders.map((order) => order.reference));
  }

  function selectWithoutOverseas() {
    selectByPredicate(
      (order) => !isOverseasDestination(order.shippingAddress?.country || "")
    );
  }

  function selectWithoutAfrica() {
    selectByPredicate(
      (order) => !isAfricaDestination(order.shippingAddress?.country || "")
    );
  }

  function selectOverseas() {
    selectByPredicate((order) =>
      isOverseasDestination(order.shippingAddress?.country || "")
    );
  }

  function selectAfrica() {
    selectByPredicate((order) =>
      isAfricaDestination(order.shippingAddress?.country || "")
    );
  }

  function resetFilters() {
    setLogisticsFilter("all");
    setExportFilter("all");
    setZoneFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchTerm("");
  }

  function exportSelection(
    format:
      | "csv"
      | "xlsx"
      | "chronopost"
      | "word"
      | "customs-pdf"
      | "customs-pdf-chronopost"
  ) {
    if (selected.length === 0) return;

    const params = new URLSearchParams();

    for (const reference of selected) {
      params.append("refs", reference);
    }

    if (logisticsFilter !== "all") {
      params.set("logisticsStatus", logisticsFilter);
    }

    if (dateFrom) {
      params.set("dateFrom", new Date(dateFrom).toISOString());
    }

    if (dateTo) {
      params.set("dateTo", new Date(dateTo).toISOString());
    }

    const base =
      format === "customs-pdf"
        ? "/api/orders/export/customs-pdf"
        : format === "customs-pdf-chronopost"
          ? "/api/orders/export/customs-pdf-chronopost"
          : `/api/orders/export/${format}`;

    window.location.href = `${base}?${params.toString()}`;
  }

  async function markSelectedAsExported() {
    if (selected.length === 0 || busy) return;

    setBusy(true);
    try {
      const response = await fetch("/api/orders/mark-exported", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ references: selected }),
      });

      if (!response.ok) {
        alert("Impossible de marquer la sélection comme exportée.");
        return;
      }

      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function deleteOrder(reference: string) {
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer la commande ${reference} ?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingReference(reference);

    try {
      const response = await fetch("/api/admin/orders/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          typeof data?.error === "string"
            ? data.error
            : "Impossible de supprimer la commande."
        );
        return;
      }

      window.location.reload();
    } catch {
      alert("Impossible de supprimer la commande.");
    } finally {
      setDeletingReference(null);
    }
  }

  const customsEligibleSelectedCount = orders.filter(
    (order) =>
      selected.includes(order.reference) &&
      isInternationalCustomsEligible(order.shippingAddress?.country)
  ).length;

  return (
    <section className="panel table-wrap" style={{ overflowX: "auto" }}>
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
        <h1 style={{ margin: 0 }}>Commandes</h1>
        <div style={{ fontWeight: 600 }}>
          {selected.length} commande(s) sélectionnée(s)
        </div>
      </div>

      <div
        style={{
          border: "1px solid #dbe3ee",
          borderRadius: "16px",
          padding: "16px",
          background: "#f8fafc",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <label style={{ display: "grid", gap: "6px", minWidth: "260px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              Rechercher un client ou une commande
            </span>
            <input
              className="input"
              type="text"
              placeholder="Nom, téléphone, email ou n° de commande"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>Logistique</span>
            <select
              className="input"
              value={logisticsFilter}
              onChange={(e) => setLogisticsFilter(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="to_process">À traiter</option>
              <option value="prepared">Préparé</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>Export</span>
            <select
              className="input"
              value={exportFilter}
              onChange={(e) => setExportFilter(e.target.value)}
            >
              <option value="all">Toutes</option>
              <option value="not_exported">Non exportées</option>
              <option value="exported">Exportées</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>Zone</span>
            <select
              className="input"
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
            >
              <option value="all">Toutes</option>
              <option value="france">France métropolitaine</option>
              <option value="overseas">Outre-Mer / DOM</option>
              <option value="africa">Afrique</option>
              <option value="international">International hors Afrique et DOM</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              Date/heure début
            </span>
            <input
              className="input"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "6px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600 }}>
              Date/heure fin
            </span>
            <input
              className="input"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>

          <button type="button" className="button secondary" onClick={resetFilters}>
            Réinitialiser
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={sectionCardStyle()}>
            <div style={sectionTitleStyle()}>Sélection</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button type="button" className="button secondary" onClick={toggleAll}>
                {allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"}
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={selectAllVisible}
              >
                Sélectionner tout le filtre courant
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={selectWithoutOverseas}
              >
                Tout sans Outre-Mer
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={selectWithoutAfrica}
              >
                Tout sans l’Afrique
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={selectOverseas}
              >
                Sélectionner Outre-Mer
              </button>

              <button
                type="button"
                className="button secondary"
                onClick={selectAfrica}
              >
                Sélectionner Afrique
              </button>
            </div>
          </div>

          <div style={sectionCardStyle()}>
            <div style={sectionTitleStyle()}>Exports commandes</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button secondary"
                disabled={selected.length === 0}
                onClick={() => exportSelection("csv")}
              >
                Exporter CSV
              </button>

              <button
                type="button"
                className="button secondary"
                disabled={selected.length === 0}
                onClick={() => exportSelection("xlsx")}
              >
                Exporter Excel
              </button>

              <button
                type="button"
                className="button secondary"
                disabled={selected.length === 0}
                onClick={() => exportSelection("chronopost")}
              >
                Exporter Chronopost
              </button>

              <button
                type="button"
                className="button secondary"
                disabled={selected.length === 0}
                onClick={() => exportSelection("word")}
              >
                Exporter Word
              </button>
            </div>
          </div>

          <div style={sectionCardStyle()}>
            <div style={sectionTitleStyle()}>Fiches douanières</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button secondary"
                disabled={customsEligibleSelectedCount === 0}
                onClick={() => exportSelection("customs-pdf")}
              >
                Fiches douanières PDF
              </button>

              <button
                type="button"
                className="button secondary"
                disabled={customsEligibleSelectedCount === 0}
                onClick={() => exportSelection("customs-pdf-chronopost")}
              >
                Fiches douanières Chronopost PDF
              </button>
            </div>
          </div>

          <div style={sectionCardStyle()}>
            <div style={sectionTitleStyle()}>Actions</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="button secondary"
                disabled={selected.length === 0 || busy}
                onClick={markSelectedAsExported}
              >
                Marquer la sélection comme exportée
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "12px", fontWeight: 600 }}>
          {filteredOrders.length} résultat(s)
        </div>
      </div>

      <table
        className="table"
        style={{
          width: "100%",
          minWidth: "1080px",
          tableLayout: "fixed",
          borderCollapse: "collapse",
        }}
      >
        <colgroup>
          <col style={{ width: "34px" }} />
          <col style={{ width: "126px" }} />
          <col style={{ width: "190px" }} />
          <col style={{ width: "112px" }} />
          <col style={{ width: "250px" }} />
          <col style={{ width: "78px" }} />
          <col style={{ width: "82px" }} />
          <col style={{ width: "94px" }} />
          <col style={{ width: "100px" }} />
          <col style={{ width: "96px" }} />
        </colgroup>

        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: "center" }}>
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAll}
                aria-label="Sélectionner toutes les commandes visibles"
              />
            </th>
            <th style={headerCellStyle}>Référence</th>
            <th style={headerCellStyle}>Client</th>
            <th style={headerCellStyle}>Zone</th>
            <th style={headerCellStyle}>Produits</th>
            <th style={headerCellStyle}>Montant</th>
            <th style={headerCellStyle}>Paiement</th>
            <th style={headerCellStyle}>Logistique</th>
            <th style={headerCellStyle}>Export</th>
            <th style={headerCellStyle}>Action</th>
          </tr>
        </thead>

        <tbody>
          {filteredOrders.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                style={{
                  padding: "18px 10px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                Aucune commande ne correspond aux filtres actuels.
              </td>
            </tr>
          ) : (
            filteredOrders.map((order) => (
              <tr key={order.reference}>
                <td style={{ ...bodyCellStyle, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(order.reference)}
                    onChange={() => toggleOne(order.reference)}
                    aria-label={`Sélectionner la commande ${order.reference}`}
                  />
                </td>

                <td style={bodyCellStyle}>
                  <a
                    href={`/admin/orders/${order.reference}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-block",
                      maxWidth: "100%",
                      fontWeight: 700,
                      fontSize: "12px",
                      lineHeight: 1.2,
                      ...compactTextStyle,
                    }}
                  >
                    {order.reference}
                  </a>
                  <div style={{ marginTop: "4px", ...mutedSmallStyle }}>
                    {toDateTimeLocalValue(order.createdAt).replace("T", " ")}
                  </div>
                </td>

                <td style={bodyCellStyle}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "12px",
                      ...compactTextStyle,
                    }}
                  >
                    {order.customer.firstName} {order.customer.lastName}
                  </div>

                  <div style={{ marginTop: "3px", ...mutedSmallStyle, ...compactTextStyle }}>
                    {order.customer.email}
                  </div>

                  {order.customer.phone ? (
                    <div style={{ marginTop: "3px", ...mutedSmallStyle }}>
                      {order.customer.phone}
                    </div>
                  ) : null}
                </td>

                <td style={bodyCellStyle}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "12px",
                      ...compactTextStyle,
                    }}
                  >
                    {zoneLabel(order.shippingAddress?.country)}
                  </div>

                  {order.shippingAddress?.city ? (
                    <div style={{ marginTop: "3px", ...mutedSmallStyle, ...compactTextStyle }}>
                      {order.shippingAddress.city}
                    </div>
                  ) : null}
                </td>

                <td style={{ ...bodyCellStyle, ...compactTextStyle }}>
                  {order.items
                    .map((item) => `${item.productTitle} x${item.quantity}`)
                    .join(" | ")}
                </td>

                <td style={{ ...bodyCellStyle, whiteSpace: "nowrap", fontWeight: 700 }}>
                  {euros(order.totalAmount)}
                </td>

                <td style={bodyCellStyle}>
                  <span
                    className={badgeClass(order.paymentStatus)}
                    style={compactBadgeStyle}
                  >
                    {paymentLabel()}
                  </span>
                </td>

                <td style={bodyCellStyle}>
                  <span
                    className={badgeClass(order.logisticsStatus)}
                    style={compactBadgeStyle}
                  >
                    {logisticsLabel(order.logisticsStatus)}
                  </span>
                </td>

                <td style={bodyCellStyle}>
                  <span
                    className={exportBadgeClass(order)}
                    style={compactBadgeStyle}
                  >
                    {exportLabel(order)}
                  </span>
                </td>

                <td style={bodyCellStyle}>
                  <button
                    type="button"
                    className="button secondary small"
                    onClick={() => deleteOrder(order.reference)}
                    disabled={deletingReference === order.reference}
                    style={{
                      width: "100%",
                      minWidth: 0,
                      padding: "6px 8px",
                      fontSize: "11px",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {deletingReference === order.reference
                      ? "Suppression..."
                      : "Supprimer"}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}