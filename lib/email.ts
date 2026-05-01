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

function safeText(value?: string) {
  return String(value || "").trim();
}

export async function sendPaymentConfirmationEmail(order: Order) {
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

  const shippingHtml = containsPhysicalProduct(order)
    ? `
      <p style="margin: 0 0 8px;"><strong>Adresse de livraison confirmée</strong></p>
      <p style="margin: 0 0 4px;">Nom : <strong>${safeText(
        `${order.customer.firstName} ${order.customer.lastName}`.trim()
      )}</strong></p>
      <p style="margin: 0 0 4px;">Adresse : <strong>${safeText(
        order.shippingAddress?.address1
      )}</strong></p>
      ${
        safeText(order.shippingAddress?.address2)
          ? `<p style="margin: 0 0 4px;">Complément : <strong>${safeText(
              order.shippingAddress?.address2
            )}</strong></p>`
          : ""
      }
      <p style="margin: 0 0 4px;">Code postal : <strong>${safeText(
        order.shippingAddress?.postalCode
      )}</strong></p>
      <p style="margin: 0 0 4px;">Ville : <strong>${safeText(
        order.shippingAddress?.city
      )}</strong></p>
      <p style="margin: 0 0 4px;">Pays / destination : <strong>${safeText(
        order.shippingAddress?.country
      )}</strong></p>
      <p style="margin: 0 0 4px;">Email : <strong>${safeText(
        order.customer.email
      )}</strong></p>
      <p style="margin: 0 0 16px;">Téléphone : <strong>${safeText(
        order.customer.phone
      )}</strong></p>

      <p>
        Pour les produits physiques, les informations de suivi et de livraison vous seront communiquées dès que votre envoi sera traité par l’agence de livraison partenaire. Les délais peuvent varier de 3 à 10 jours en fonction de la densité des demandes.
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

        <p>Bonjour ${safeText(order.customer.firstName)},</p>

        <p>
          Nous vous remercions de tout cœur pour votre confiance et pour votre soutien à <strong>Solidarité Cœur Actif</strong>. Votre paiement a bien été reçu, et votre commande <strong>${order.reference}</strong> a été enregistrée avec succès.
        </p>

        <p><strong>Récapitulatif de votre commande</strong></p>
        <ul>${itemsHtml}</ul>

        <p>Sous-total : <strong>${formatAmount(order.subtotalAmount, order.currency)}</strong></p>
        <p>Livraison : <strong>${formatAmount(order.shippingAmount, order.currency)}</strong></p>
        <p>Total payé : <strong>${formatAmount(order.totalAmount, order.currency)}</strong></p>

        ${shippingHtml}

        <p>
          Le reçu de paiement Stripe qui vous a été envoyé dans le second mail tient lieu de confirmation de paiement officielle. Nous vous conseillons de le conserver précieusement.
        </p>

        <p>
          Merci encore pour votre soutien. Par votre geste, vous contribuez concrètement aux actions de l’association et à cette mission de foi et de solidarité portée au service de nombreuses personnes.
        </p>

        <p>
          Avec reconnaissance,<br />
          <strong>Solidarité Cœur Actif</strong><br />
          Email : solidaritecoeuractif@gmail.com<br />
          Téléphone : 0033745224124
        </p>
      </div>
    `,
  });
}