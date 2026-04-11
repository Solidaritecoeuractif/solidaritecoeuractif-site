"use client";

import { useMemo, useState } from "react";
import { euros } from "@/lib/utils";

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
  };
  items: OrderItem[];
};

function badgeClass(status: string) {
  if (status === "paid" || status === "delivered") return `badge ${status}`;
  if (status === "pending" || status === "to_process") return `badge ${status}`;
  return "badge cancelled";
}

function paymentLabel(status: string) {
  if (status === "paid") return "Payé";
  if (status === "pending") return "En attente";
  return status;
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

export default function OrdersTableClient({ orders }: { orders: Order[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [logisticsFilter, setLogisticsFilter] = useState("all");
  const [exportFilter, setExportFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const paymentOk =
        paymentFilter === "all" ? true : order.paymentStatus === paymentFilter;

      const logisticsOk =
        logisticsFilter === "all" ? true : order.logisticsStatus === logisticsFilter;

      const exportOk =
        exportFilter === "all"
          ? true
          : exportFilter === "exported"
          ? Boolean(order.exportedAt)
          : !order.exportedAt;

      const orderDate = new Date(order.createdAt).getTime();
      const fromOk = dateFrom ? orderDate >= new Date(dateFrom).getTime() : true;
      const toOk = dateTo ? orderDate <= new Date(dateTo).getTime() : true;

      return paymentOk && logisticsOk && exportOk && fromOk && toOk;
    });
  }, [orders, paymentFilter, logisticsFilter, exportFilter, dateFrom, dateTo]);

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

  function resetFilters() {
    setPaymentFilter("all");
    setLogisticsFilter("all");
    setExportFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  function exportSelection(format: "csv" | "xlsx" | "chronopost") {
    if (selected.length === 0) return;

    const params = new URLSearchParams();

    for (const reference of selected) {
      params.append("refs", reference);
    }

    if (paymentFilter !== "all") {
      params.set("paymentStatus", paymentFilter);
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

    window.location.href = `/api/orders/export/${format}?${params.toString()}`;
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
        <h1 style={{ margin: 0 }}>Commandes</h1>
        <div style={{ fontWeight: 600 }}>
          {selected.length} commande(s) sélectionnée(s)
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "end",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Paiement</span>
          <select className="input" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="paid">Payé</option>
            <option value="pending">En attente</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Logistique</span>
          <select className="input" value={logisticsFilter} onChange={(e) => setLogisticsFilter(e.target.value)}>
            <option value="all">Tous</option>
            <option value="to_process">À traiter</option>
            <option value="prepared">Préparé</option>
            <option value="shipped">Expédié</option>
            <option value="delivered">Livré</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Export</span>
          <select className="input" value={exportFilter} onChange={(e) => setExportFilter(e.target.value)}>
            <option value="all">Toutes</option>
            <option value="not_exported">Non exportées</option>
            <option value="exported">Exportées</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Date/heure début</span>
          <input className="input" type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600 }}>Date/heure fin</span>
          <input className="input" type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>

        <button type="button" className="button secondary" onClick={resetFilters}>
          Réinitialiser
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <button type="button" className="button secondary" onClick={toggleAll}>
          {allVisibleSelected ? "Tout désélectionner" : "Tout sélectionner"}
        </button>

        <button type="button" className="button secondary" disabled={selected.length === 0} onClick={() => exportSelection("csv")}>
          Exporter la sélection en CSV
        </button>

        <button type="button" className="button secondary" disabled={selected.length === 0} onClick={() => exportSelection("xlsx")}>
          Exporter la sélection en Excel
        </button>

	<button type="button" className="button secondary" disabled={selected.length === 0} onClick={() => exportSelection("chronopost")}>
  Exporter la sélection Chronopost
</button>

        <button type="button" className="button secondary" disabled={selected.length === 0 || busy} onClick={markSelectedAsExported}>
          Marquer la sélection comme exportée
        </button>

        <div style={{ fontWeight: 600 }}>
          {filteredOrders.length} résultat(s)
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "48px" }}>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
            </th>
            <th>Référence</th>
            <th>Client</th>
            <th>Produits</th>
            <th>Montant</th>
            <th>Paiement</th>
            <th>Logistique</th>
            <th>Export</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order) => (
            <tr key={order.reference}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(order.reference)}
                  onChange={() => toggleOne(order.reference)}
                />
              </td>
              <td>
                <a href={`/admin/orders/${order.reference}`}>{order.reference}</a>
                <br />
                <small>{toDateTimeLocalValue(order.createdAt).replace("T", " ")}</small>
              </td>
              <td>
                {order.customer.firstName} {order.customer.lastName}
                <br />
                <small>{order.customer.email}</small>
              </td>
              <td>
                {order.items.map((item) => `${item.productTitle} x${item.quantity}`).join(" | ")}
              </td>
              <td>{euros(order.totalAmount)}</td>
              <td>
                <span className={badgeClass(order.paymentStatus)}>
                  {paymentLabel(order.paymentStatus)}
                </span>
              </td>
              <td>
                <span className={badgeClass(order.logisticsStatus)}>
                  {logisticsLabel(order.logisticsStatus)}
                </span>
              </td>
              <td>
                <span className={exportBadgeClass(order)}>
                  {exportLabel(order)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}