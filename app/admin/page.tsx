
import Link from "next/link";
import { storage } from "@/lib/storage";

export default async function AdminDashboardPage() {
  const [products, orders] = await Promise.all([storage().getProducts(), storage().getOrders()]);
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  return (
    <div className="admin-grid">
      <section className="stats-grid" style={{ width: "100%", margin: 0 }}>
        <article className="stat-card"><span>Offres</span><strong>{products.length}</strong></article>
        <article className="stat-card"><span>Commandes</span><strong>{orders.length}</strong></article>
        <article className="stat-card"><span>Payées</span><strong>{paidOrders.length}</strong></article>
      </section>
      <section className="panel">
        <h2>Actions rapides</h2>
        <div className="actions-row">
          <Link href="/admin/orders" className="button secondary">Voir les commandes</Link>
          <Link href="/admin/products" className="button secondary">Gérer les offres</Link>
          <a href="/api/orders/export/csv" className="button secondary">Exporter CSV</a>
          <a href="/api/orders/export/xlsx" className="button secondary">Exporter Excel</a>
        </div>
      </section>
    </div>
  );
}
