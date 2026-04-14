import Link from "next/link";
import { storage } from "@/lib/storage";

export default async function AdminDashboardPage() {
  const [products, orders] = await Promise.all([
    storage().getProducts(),
    storage().getOrders(),
  ]);

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");

  return (
    <div className="admin-grid">
      <section className="panel" style={{ width: "100%" }}>
        <div
          className="actions-row"
          style={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <h1 style={{ margin: 0 }}>Espace admin</h1>

          <form action="/api/auth/logout" method="post">
            <button className="button ghost" type="submit">
              Se déconnecter
            </button>
          </form>
        </div>
      </section>

      <section className="stats-grid" style={{ width: "100%", margin: 0 }}>
        <article className="stat-card">
          <span>Offres</span>
          <strong>{products.length}</strong>
        </article>
        <article className="stat-card">
          <span>Commandes payées</span>
          <strong>{paidOrders.length}</strong>
        </article>
        <article className="stat-card">
          <span>Total payées</span>
          <strong>
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
            }).format(
              paidOrders.reduce((sum, order) => sum + order.totalAmount, 0) / 100
            )}
          </strong>
        </article>
      </section>

      <section className="panel">
        <h2>Actions rapides</h2>
        <div className="actions-row">
          <Link href="/admin/orders" className="button secondary">
            Voir les commandes
          </Link>
          <Link href="/admin/products" className="button secondary">
            Gérer les offres
          </Link>
          <a href="/api/orders/export/csv" className="button secondary">
            Exporter CSV
          </a>
          <a href="/api/orders/export/xlsx" className="button secondary">
            Exporter Excel
          </a>
        </div>
      </section>
    </div>
  );
}