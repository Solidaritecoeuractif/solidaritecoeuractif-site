/**
 * Contrôle à effectuer après validation de la signature du webhook Stripe.
 * Aucune notification client ni simple page de succès ne peut marquer payée
 * une commande. Le rapprochement échoue fermé en cas de valeur manquante.
 */
export type CheckoutSessionForVerification = {
  id: string;
  mode: string | null;
  status: string | null;
  payment_status: string;
  client_reference_id: string | null;
  currency: string | null;
  amount_total: number | null;
};

export type StoredOrderForVerification = {
  reference: string;
  stripeSessionId?: string;
  totalAmount: number;
  currency: string;
  paymentStatus?: string;
};

export function paymentSessionMatchesOrder(
  session: CheckoutSessionForVerification,
  order: StoredOrderForVerification
): boolean {
  return session.mode === "payment" &&
    session.status === "complete" &&
    session.payment_status === "paid" &&
    typeof order.stripeSessionId === "string" && order.stripeSessionId.length > 0 &&
    session.id === order.stripeSessionId &&
    session.client_reference_id === order.reference &&
    Number.isSafeInteger(order.totalAmount) && order.totalAmount > 0 &&
    session.amount_total === order.totalAmount &&
    typeof session.currency === "string" &&
    session.currency.toUpperCase() === order.currency.toUpperCase() &&
    order.paymentStatus !== "cancelled";
}
