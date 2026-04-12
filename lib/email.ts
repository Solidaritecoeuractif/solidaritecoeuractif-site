import { Resend } from "resend";
import type { Order } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatAmount(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(amountInCents / 100);
}

export async function sendPaymentConfirmationEmail(
  order: Order,
  pdfBuffer: Buffer
) {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM manquant.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY manquant.");
  }

  const subject = `Confirmation de paiement – ${order.reference}`;

  const itemsHtml = order.items
    .map(
      (item) =>
        `<li>${item.productTitle} × ${item.quantity} — ${formatAmount(
          item.unitAmount * item.quantity,
          order.currency
        )}</li>`
    )
    .join("");

  await resend.emails.send({
    from,
    to: order.customer.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Confirmation de paiement</h2>
        <p>Bonjour ${order.customer.firstName},</p>
        <p>
          Nous vous confirmons la bonne réception de votre paiement pour la référence
          <strong>${order.reference}</strong>.
        </p>
        <p><strong>Récapitulatif :</strong></p>
        <ul>${itemsHtml}</ul>
        <p>Sous-total : <strong>${formatAmount(order.subtotalAmount, order.currency)}</strong></p>
        <p>Livraison : <strong>${formatAmount(order.shippingAmount, order.currency)}</strong></p>
        <p>Total payé : <strong>${formatAmount(order.totalAmount, order.currency)}</strong></p>
        <p>
          Vous trouverez en pièce jointe votre attestation de paiement au format PDF.
        </p>
        <p>Dieu vous Bénisse.</p>
        <p>Solidarité Cœur Actif</p>
      </div>
    `,
    attachments: [
      {
        filename: `attestation-paiement-${order.reference}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}