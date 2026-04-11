import type { Order } from "@/lib/types";

export function orderConfirmationEmail(order: Order) {
  return {
    subject: `Confirmation de commande ${order.reference}`,
    html: `<h1>Merci pour votre commande</h1><p>Référence : <strong>${order.reference}</strong></p><p>Montant payé : ${(order.totalAmount / 100).toFixed(2)} ${order.currency}</p>`
  };
}

export function adminNotificationEmail(order: Order) {
  return {
    subject: `Nouvelle commande payée ${order.reference}`,
    html: `<p>Une commande vient d’être payée.</p><p>Client : ${order.customer.firstName} ${order.customer.lastName}</p>`
  };
}
