
import Stripe from "stripe";

let client: Stripe | null = null;

export function stripe() {
  if (client) return client;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY manquant.");
  client = new Stripe(secret, {
    apiVersion: "2025-02-24.acacia"
  });
  return client;
}
