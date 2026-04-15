import Link from "next/link";
import { notFound } from "next/navigation";
import { storage } from "@/lib/storage";
import { euros } from "@/lib/utils";

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

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Informations client</h2>
        <div className="form-grid">
          <label>
            <span>Prénom</span>
            <input value={order.customer.firstName || ""} readOnly />
          </label>

          <label>
            <span>Nom</span>
            <input value={order.customer.lastName || ""} readOnly />
          </label>

          <label>
            <span>Email</span>
            <input value={order.customer.email || ""} readOnly />
          </label>

          <label>
            <span>Téléphone</span>
            <input value={order.customer.phone || ""} readOnly />
          </label>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Données saisies pour la livraison</h2>
        <div className="form-grid">
          <label>
            <span>Pays</span>
            <input value={order.shippingAddress?.country || ""} readOnly />
          </label>

          <label>
            <span>Ville</span>
            <input value={order.shippingAddress?.city || ""} readOnly />
          </label>

          <label>
            <span>Code postal</span>
            <input value={order.shippingAddress?.postalCode || ""} readOnly />
          </label>

          <label className="full">
            <span>Adresse</span>
            <input value={order.shippingAddress?.address1 || ""} readOnly />
          </label>

          <label className="full">
            <span>Complément d’adresse</span>
            <input value={order.shippingAddress?.address2 || ""} readOnly />
          </label>

          <label className="full">
            <span>Informations complémentaires</span>
            <textarea value={order.shippingAddress?.notes || ""} readOnly />
          </label>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Commande</h2>
        <div className="form-grid">
          <label>
            <span>Statut de paiement</span>
            <input value={order.paymentStatus || ""} readOnly />
          </label>

          <label>
            <span>Statut logistique</span>
            <input value={order.logisticsStatus || ""} readOnly />
          </label>

          <label>
            <span>Sous-total</span>
            <input value={euros(order.subtotalAmount || 0)} readOnly />
          </label>

          <label>
            <span>Livraison</span>
            <input value={euros(order.shippingAmount || 0)} readOnly />
          </label>

          <label>
            <span>Total payé</span>
            <input value={euros(order.totalAmount || 0)} readOnly />
          </label>

          <label>
            <span>Devise</span>
            <input value={order.currency || ""} readOnly />
          </label>

          <label className="full">
            <span>Référence Stripe session</span>
            <input value={order.stripeSessionId || ""} readOnly />
          </label>

          <label className="full">
            <span>Référence Stripe payment intent</span>
            <input value={order.stripePaymentIntentId || ""} readOnly />
          </label>
        </div>
      </section>

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