export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { storage } from "@/lib/storage";
import { euros } from "@/lib/utils";
import AdminOrderDetailClient from "@/components/AdminOrderDetailClient";

function formatDate(value: string) {
  return new Date(value).toLocaleString("fr-FR");
}

function lineValue(unitAmount: number, quantity: number) {
  return euros(unitAmount * quantity);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const orders = await storage().getOrders();
  const order = orders.find((entry) => entry.reference === reference);

  if (!order) notFound();

  return (
    <main className="admin-wrap">
      <div className="actions-row" style={{ marginBottom: 16 }}>
        <Link href="/admin/orders" className="button secondary small">
          Retour aux commandes
        </Link>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h1 style={{ marginTop: 0 }}>Commande {order.reference}</h1>
        <p style={{ marginBottom: 0 }}>
          Créée le {formatDate(order.createdAt)}
          {order.updatedAt ? ` • Mise à jour le ${formatDate(order.updatedAt)}` : ""}
        </p>
      </section>

      <AdminOrderDetailClient order={order} />

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Détail des lignes</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantité</th>
              <th>Montant unitaire</th>
              <th>Total ligne</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.productTitle}-${index}`}>
                <td>{item.productTitle}</td>
                <td>{item.quantity}</td>
                <td>{euros(item.unitAmount || 0)}</td>
                <td>{lineValue(item.unitAmount || 0, item.quantity || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Attestation</h2>
        <p>
          <a
            href={`/api/orders/${order.reference}/receipt`}
            target="_blank"
            rel="noreferrer"
          >
            Télécharger l’attestation du client
          </a>
        </p>
      </section>
    </main>
  );
}