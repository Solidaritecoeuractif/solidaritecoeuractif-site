import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { storage } from "@/lib/storage";
import { ticketingStorage } from "@/lib/ticketing";
import {
  sendPaymentConfirmationEmail,
  sendTicketingConfirmationEmail,
  sendTicketingOrganizerNotificationEmail,
} from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET manquant." },
      { status: 500 }
    );
  }

  try {
    const event = stripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const checkoutType = session.metadata?.checkoutType;
      const reference =
        session.metadata?.ticketingReference || session.client_reference_id;

      if (checkoutType === "ticketing" && reference) {
        const ticketing = ticketingStorage();
        const order = await ticketing.getTicketingOrderByReference(reference);

        if (order) {
          const wasAlreadyPaid = order.paymentStatus === "paid";
          const confirmationAlreadySent = Boolean(order.confirmationEmailSentAt);
          const organizerNotificationAlreadySent = Boolean(
            order.adminNotificationSentAt
          );

          order.paymentStatus = "paid";
          order.stripeSessionId = session.id;
          order.stripePaymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          order.updatedAt = new Date().toISOString();

          await ticketing.updateTicketingOrder(reference, order);

          const ticketingEvent = await ticketing.getTicketingEventById(
            order.eventId
          );

          if (ticketingEvent) {
            const rates = await ticketing.getTicketingRates(ticketingEvent.id);

            if (!wasAlreadyPaid || !confirmationAlreadySent) {
              try {
                if (ticketingEvent.confirmationEmailEnabled !== false) {
                  await sendTicketingConfirmationEmail({
                    order,
                    event: ticketingEvent,
                    rates,
                  });

                  const now = new Date().toISOString();
                  order.confirmationEmailSentAt = now;
                  order.updatedAt = now;

                  await ticketing.updateTicketingOrder(reference, order);
                }
              } catch (emailError) {
                console.error(
                  "Erreur envoi email confirmation billetterie",
                  emailError
                );
              }
            }

            if (!wasAlreadyPaid || !organizerNotificationAlreadySent) {
              try {
                await sendTicketingOrganizerNotificationEmail({
                  order,
                  event: ticketingEvent,
                  rates,
                });

                const now = new Date().toISOString();
                order.adminNotificationSentAt = now;
                order.updatedAt = now;

                await ticketing.updateTicketingOrder(reference, order);
              } catch (emailError) {
                console.error(
                  "Erreur envoi email notification organisateur",
                  emailError
                );
              }
            }
          }
        }

        return NextResponse.json({ received: true });
      }

      const classicReference = session.client_reference_id;

      if (classicReference) {
        const classicStorage = storage();
        const order = await classicStorage.getOrderByReference(classicReference);

        if (order) {
          const wasAlreadyPaid = order.paymentStatus === "paid";
          const emailAlreadySent = Boolean(order.emailSentAt);

          order.paymentStatus = "paid";
          order.stripeSessionId = session.id;
          order.stripePaymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          order.updatedAt = new Date().toISOString();

          await classicStorage.updateOrder(classicReference, order);

          if (!wasAlreadyPaid || !emailAlreadySent) {
            try {
              await sendPaymentConfirmationEmail(order);

              const now = new Date().toISOString();
              order.emailSentAt = now;
              order.paymentReceiptSentAt = now;
              order.updatedAt = now;

              await classicStorage.updateOrder(classicReference, order);
            } catch (emailError) {
              console.error(
                "Erreur envoi email confirmation commande classique",
                emailError
              );
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }
}