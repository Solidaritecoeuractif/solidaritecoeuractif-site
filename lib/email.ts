import { Resend } from "resend";
import type { Order } from "@/lib/types";
import type {
  TicketingEvent,
  TicketingOrder,
  TicketingRate,
} from "@/lib/ticketing/types";

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

function safeText(value?: string | number | boolean | null) {
  return String(value ?? "").trim();
}

function escapeHtml(value?: string | number | boolean | null) {
  return safeText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphHtml(value?: string) {
  const text = safeText(value);

  if (!text) return "";

  return escapeHtml(text).replace(/\n/g, "<br />");
}

function requireEmailConfig() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM manquant.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY manquant.");
  }

  return from;
}

function buildTicketingParticipantsHtml({
  order,
  rates,
}: {
  order: TicketingOrder;
  rates: TicketingRate[];
}) {
  const rateById = new Map(rates.map((rate) => [rate.id, rate.name]));

  return order.participants
    .map((participant, index) => {
      const answers = participant.answers || {};
      const complementaryAnswers = { ...answers };

      delete complementaryAnswers.age;
      delete complementaryAnswers.email;
      delete complementaryAnswers.phone;
      delete complementaryAnswers.origin_city;

      const complementaryHtml = Object.entries(complementaryAnswers)
        .filter(([, value]) => safeText(value))
        .map(
          ([key, value]) =>
            `<li>${escapeHtml(key)} : <strong>${escapeHtml(value)}</strong></li>`
        )
        .join("");

      return `
        <div style="margin: 0 0 14px; padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <p style="margin: 0 0 8px;"><strong>Participant ${index + 1}</strong></p>
          <p style="margin: 0 0 4px;">Nom : <strong>${escapeHtml(
            `${participant.firstName} ${participant.lastName}`.trim()
          )}</strong></p>
          <p style="margin: 0 0 4px;">Tarif : <strong>${escapeHtml(
            rateById.get(participant.rateId) || participant.rateId
          )}</strong></p>
          <p style="margin: 0 0 4px;">Âge : <strong>${escapeHtml(
            answers.age
          )}</strong></p>
          <p style="margin: 0 0 4px;">Email : <strong>${escapeHtml(
            answers.email
          )}</strong></p>
          <p style="margin: 0 0 4px;">Téléphone : <strong>${escapeHtml(
            answers.phone
          )}</strong></p>
          <p style="margin: 0 0 8px;">Ville d’origine : <strong>${escapeHtml(
            answers.origin_city
          )}</strong></p>
          ${
            complementaryHtml
              ? `<p style="margin: 10px 0 6px;"><strong>Informations complémentaires</strong></p><ul style="margin-top: 0;">${complementaryHtml}</ul>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

export async function sendPaymentConfirmationEmail(order: Order) {
  const from = requireEmailConfig();

  const subject = `Confirmation de paiement – ${order.reference}`;
  const supportAmount = Math.max(
    0,
    order.totalAmount - order.subtotalAmount - order.shippingAmount
  );

  const itemsHtml = order.items
    .map(
      (item) =>
        `<li>${escapeHtml(item.productTitle)} × ${escapeHtml(
          item.quantity
        )} — ${formatAmount(item.unitAmount * item.quantity, order.currency)}</li>`
    )
    .join("");

  const shippingHtml = containsPhysicalProduct(order)
    ? `
      <p style="margin: 0 0 8px;"><strong>📦 Adresse de livraison confirmée</strong></p>
      <p style="margin: 0 0 4px;">Nom : <strong>${escapeHtml(
        `${order.customer.firstName} ${order.customer.lastName}`.trim()
      )}</strong></p>
      <p style="margin: 0 0 4px;">Adresse : <strong>${escapeHtml(
        order.shippingAddress?.address1
      )}</strong></p>
      ${
        safeText(order.shippingAddress?.address2)
          ? `<p style="margin: 0 0 4px;">Complément : <strong>${escapeHtml(
              order.shippingAddress?.address2
            )}</strong></p>`
          : ""
      }
      <p style="margin: 0 0 4px;">Code postal : <strong>${escapeHtml(
        order.shippingAddress?.postalCode
      )}</strong></p>
      <p style="margin: 0 0 4px;">Ville : <strong>${escapeHtml(
        order.shippingAddress?.city
      )}</strong></p>
      <p style="margin: 0 0 4px;">Pays / destination : <strong>${escapeHtml(
        order.shippingAddress?.country
      )}</strong></p>
      <p style="margin: 0 0 4px;">Email : <strong>${escapeHtml(
        order.customer.email
      )}</strong></p>
      <p style="margin: 0 0 16px;">Téléphone : <strong>${escapeHtml(
        order.customer.phone
      )}</strong></p>

      <p>
        Pour les produits physiques, les informations de suivi et de livraison vous seront communiquées dès que votre envoi sera traité par l’agence de livraison partenaire. Les délais peuvent varier de 3 à 10 jours en fonction de la densité des demandes.
      </p>
    `
    : "";

  const shippingLine =
    order.shippingAmount > 0
      ? `<p>Livraison : <strong>${formatAmount(
          order.shippingAmount,
          order.currency
        )}</strong></p>`
      : "";

  const supportLine =
    supportAmount > 0
      ? `<p>Participation libre à Solidarité Cœur Actif : <strong>${formatAmount(
          supportAmount,
          order.currency
        )}</strong></p>`
      : "";

  await resend.emails.send({
    from,
    to: order.customer.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 16px;">Confirmation de paiement</h2>

        <p>Bonjour ${escapeHtml(order.customer.firstName)},</p>

        <p>
          Nous vous remercions de tout cœur pour votre confiance ❤️ et pour votre soutien à <strong>Solidarité Cœur Actif</strong>. Votre paiement a bien été reçu, et votre commande <strong>${escapeHtml(
            order.reference
          )}</strong> a été enregistrée avec succès.
        </p>

        <p><strong>Récapitulatif de votre commande</strong></p>
        <ul>${itemsHtml}</ul>

        <p>Sous-total : <strong>${formatAmount(
          order.subtotalAmount,
          order.currency
        )}</strong></p>
        ${shippingLine}
        ${supportLine}
        <p>Total payé : <strong>${formatAmount(
          order.totalAmount,
          order.currency
        )}</strong></p>

        ${shippingHtml}

        <p>
          Le reçu de paiement Stripe qui vous a été envoyé dans le second mail tient lieu de confirmation de paiement officielle. Nous vous conseillons de le conserver précieusement car cela pourrait être demandé pour le suivi du colis.
        </p>

        <p>
          Merci encore pour votre soutien. Par votre geste, vous contribuez concrètement aux actions de l’association et à cette mission de foi et de solidarité portée au service de nombreuses personnes.
        </p>

        <p>
          Avec notre reconnaissance 🙏<br />
          <strong>Solidarité Cœur Actif</strong><br />
          Email : solidaritecoeuractif@gmail.com<br />
          Téléphone : 0033745224124
        </p>
      </div>
    `,
  });
}

export async function sendTicketingConfirmationEmail({
  order,
  event,
  rates,
}: {
  order: TicketingOrder;
  event: TicketingEvent;
  rates: TicketingRate[];
}) {
  const from = requireEmailConfig();

  const subject =
    safeText(event.confirmationEmailSubject) ||
    `Confirmation d’inscription – ${event.title}`;

  const customMessageHtml = safeText(event.confirmationEmailMessage)
    ? `
      <div style="margin: 18px 0; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc;">
        ${paragraphHtml(event.confirmationEmailMessage)}
      </div>
    `
    : "";

  const participantsHtml = buildTicketingParticipantsHtml({ order, rates });

  await resend.emails.send({
    from,
    to: order.payerEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 16px;">Confirmation d’inscription</h2>

        <p>Bonjour ${escapeHtml(order.payerFirstName)},</p>

        <p>
          Votre paiement a bien été reçu et votre inscription à <strong>${escapeHtml(
            event.title
          )}</strong> a été enregistrée avec succès.
        </p>

        ${customMessageHtml}

        <p><strong>Récapitulatif de l’inscription</strong></p>

        <p style="margin: 0 0 4px;">Référence : <strong>${escapeHtml(
          order.reference
        )}</strong></p>
        <p style="margin: 0 0 4px;">Statut : <strong>Payée</strong></p>
        <p style="margin: 0 0 4px;">Nombre de participant(s) : <strong>${escapeHtml(
          order.participants.length
        )}</strong></p>
        <p style="margin: 0 0 16px;">Montant événement : <strong>${formatAmount(
          order.subtotalAmount,
          order.currency
        )}</strong></p>

        <p><strong>Contact principal</strong></p>
        <p style="margin: 0 0 4px;">Nom : <strong>${escapeHtml(
          `${order.payerFirstName} ${order.payerLastName}`.trim()
        )}</strong></p>
        <p style="margin: 0 0 4px;">Email : <strong>${escapeHtml(
          order.payerEmail
        )}</strong></p>
        <p style="margin: 0 0 16px;">Téléphone : <strong>${escapeHtml(
          order.payerPhone
        )}</strong></p>

        <p><strong>Participant(s)</strong></p>
        ${participantsHtml || "<p>Aucun participant enregistré.</p>"}

        <p>
          Le reçu de paiement Stripe envoyé séparément tient lieu de confirmation de paiement officielle.
        </p>

        <p>
          Merci pour votre inscription.<br />
          <strong>Solidarité Cœur Actif</strong>
        </p>
      </div>
    `,
  });
}

export async function sendTicketingOrganizerNotificationEmail({
  order,
  event,
  rates,
}: {
  order: TicketingOrder;
  event: TicketingEvent;
  rates: TicketingRate[];
}) {
  const from = requireEmailConfig();
  const organizerEmail = safeText(event.organizerEmail);

  if (!organizerEmail) {
    return;
  }

  const participantsHtml = buildTicketingParticipantsHtml({ order, rates });

  await resend.emails.send({
    from,
    to: organizerEmail,
    subject: `Nouvelle inscription payée – ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2 style="margin-bottom: 16px;">Nouvelle inscription payée</h2>

        <p>
          Une nouvelle inscription vient d’être confirmée pour la billetterie :
          <strong>${escapeHtml(event.title)}</strong>.
        </p>

        <div style="margin: 18px 0; padding: 14px 16px; border: 1px solid #dbe3ee; border-radius: 12px; background: #f8fafc;">
          <p style="margin: 0 0 4px;">Référence : <strong>${escapeHtml(
            order.reference
          )}</strong></p>
          <p style="margin: 0 0 4px;">Statut : <strong>Payée</strong></p>
          <p style="margin: 0 0 4px;">Nombre de participant(s) : <strong>${escapeHtml(
            order.participants.length
          )}</strong></p>
          <p style="margin: 0;">Montant événement : <strong>${formatAmount(
            order.subtotalAmount,
            order.currency
          )}</strong></p>
        </div>

        <p><strong>Contact principal</strong></p>
        <p style="margin: 0 0 4px;">Nom : <strong>${escapeHtml(
          `${order.payerFirstName} ${order.payerLastName}`.trim()
        )}</strong></p>
        <p style="margin: 0 0 4px;">Email : <strong>${escapeHtml(
          order.payerEmail
        )}</strong></p>
        <p style="margin: 0 0 16px;">Téléphone : <strong>${escapeHtml(
          order.payerPhone
        )}</strong></p>

        <p><strong>Participant(s)</strong></p>
        ${participantsHtml || "<p>Aucun participant enregistré.</p>"}

        <p style="margin-top: 18px;">
          Cette inscription est désormais visible dans votre espace organisateur.
        </p>

        <p>
          <strong>Solidarité Cœur Actif</strong>
        </p>
      </div>
    `,
  });
}