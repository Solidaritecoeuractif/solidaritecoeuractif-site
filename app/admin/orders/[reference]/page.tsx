import Link from "next/link";
import { notFound } from "next/navigation";
import { storage } from "@/lib/storage";
import { euros } from "@/lib/utils";

const logistics = ["to_process", "prepared", "shipped", "delivered", "cancelled"];
const payments = ["pending", "paid", "cancelled"];

export default async function OrderDetailPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const order = await storage().getOrderByReference(reference);
  if (!order) notFound();

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="actions-row"><Link href="/admin/orders" className="button secondary small">Retour</Link></div>
        <h1>Commande {order.reference}</h1>
        <p><strong>Client :</strong> {order.customer.firstName} {order.customer.lastName} — {order.customer.email} — {order.customer.phone}</p>
        {order.shippingAddress ? <p><strong>Livraison :</strong> {order.shippingAddress.address1}, {order.shippingAddress.postalCode} {order.shippingAddress.city}, {order.shippingAddress.country}</p> : <p>Pas de livraison requise.</p>}
        <div className="summary-row"><span>Sous-total</span><strong>{euros(order.subtotalAmount)}</strong></div>
        <div className="summary-row"><span>Livraison</span><strong>{euros(order.shippingAmount)}</strong></div>
        <div className="summary-row total"><span>Total</span><strong>{euros(order.totalAmount)}</strong></div>
      </section>
      <section className="panel">
        <h2>Lignes de commande</h2>
        {order.items.map((item) => (
          <div className="summary-row" key={item.id}><span>{item.productTitle} x{item.quantity}</span><strong>{euros(item.unitAmount * item.quantity)}</strong></div>
        ))}
      </section>
      <OrderStatusManager reference={order.reference} currentPayment={order.paymentStatus} currentLogistics={order.logisticsStatus} logistics={logistics} payments={payments} />
    </div>
  );
}

function OrderStatusManager({ reference, currentPayment, currentLogistics, logistics, payments }: any) {
  return (
    <section className="panel">
      <h2>Mettre à jour les statuts</h2>
      <form action={`/admin/orders/${reference}`} method="post" className="form-grid">
        <label>
          <span>Statut paiement</span>
          <select name="paymentStatus" defaultValue={currentPayment}>{payments.map((value: string) => <option key={value} value={value}>{value}</option>)}</select>
        </label>
        <label>
          <span>Statut logistique</span>
          <select name="logisticsStatus" defaultValue={currentLogistics}>{logistics.map((value: string) => <option key={value} value={value}>{value}</option>)}</select>
        </label>
        <button className="button primary" formAction={`/admin/orders/${reference}/update`} type="submit">Mettre à jour</button>
      </form>
    </section>
  );
}
