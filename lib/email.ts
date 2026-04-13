import { Resend } from "resend";
import type { Order } from "@/lib/types";

const resend = new Resend(process.env.RESEND_API_KEY);

function formatAmount(amountInCents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: (currency || "EUR").toUpperCase(),
  }).format(amountInCents / 100);
}

function containsPhysicalProduct(order: Order) {
  return Boolean(order.shippingAddress);
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

  const deliveryInfo = containsPhysicalProduct(order)
    ? `
      <p>
        Pour les produits physiques, les informations de livraison vous seront communiquées
        par mail ou par SMS par l’agence de livraison partenaire.
      </p>
    `
    : "";

  await resend.emails.send({
    from,
    to: order.customer.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 16px;">Confirmation de paiement</h2>

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

        ${deliveryInfo}

        <p>
          Vous trouverez en pièce jointe votre attestation de paiement au format PDF.
        </p>

        <p>
          Solidarité Cœur Actif<br />
          Email : solidaritecoeuractif@gmail.com<br />
          Téléphone : 0033745224124
        </p>

        <p><strong>Dieu vous bénisse.</strong></p>
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