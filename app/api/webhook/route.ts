
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  try {
    const event = stripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || "");
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const reference = session.client_reference_id;
      if (reference) {
        const order = await storage().getOrderByReference(reference);
        if (order) {
          order.paymentStatus = "paid";
          order.stripeSessionId = session.id;
          order.stripePaymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
          order.updatedAt = new Date().toISOString();
          await storage().updateOrder(reference, order);
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Webhook invalide." }, { status: 400 });
  }
}
