import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { checkoutSchema } from "@/lib/validators";
import { resolveCart, computeTotals } from "@/lib/cart";
import { uniqueId, orderReference } from "@/lib/utils";
import { stripe } from "@/lib/stripe";
import type { Order } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = checkoutSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;

    const destinationCode = parsed.data.shippingAddress?.country || "FR";
    const products = await storage().getProducts();
    const cart = resolveCart(parsed.data.items, products, destinationCode);

    if (cart.errors.length) {
      return NextResponse.json(
        { error: cart.errors.join(" ") },
        { status: 400 }
      );
    }

    if (!cart.items.length) {
      return NextResponse.json(
        { error: "Panier vide ou invalide." },
        { status: 400 }
      );
    }

    if (cart.requiresShipping && !parsed.data.shippingAddress) {
      return NextResponse.json(
        {
          error:
            "Une adresse de livraison complète est requise pour les produits physiques.",
        },
        { status: 400 }
      );
    }

    const shippingAddress = cart.requiresShipping
      ? parsed.data.shippingAddress
      : undefined;

    const baseTotals = computeTotals(cart.items, destinationCode);

    const supportAmount =
      parsed.data.supportEnabled === false
        ? 0
        : Math.max(0, parsed.data.supportAmount || 0);

    const totalAmount = baseTotals.totalAmount + supportAmount;

    const reference = orderReference();
    const now = new Date().toISOString();

    const order: Order = {
      id: uniqueId("ord"),
      reference,
      customer: parsed.data.customer,
      shippingAddress,
      items: cart.items.map((item) => ({
        id: uniqueId("item"),
        productId: item.product.id,
        productTitle: item.product.title,
        offerType: item.product.offerType,
        pricingMode: item.product.pricingMode,
        unitAmount: item.unitAmount,
        quantity: item.quantity,
        customAmount: item.customAmount,
      })),
      subtotalAmount: baseTotals.subtotalAmount,
      shippingAmount: baseTotals.shippingAmount,
      totalAmount,
      paymentStatus: "pending",
      logisticsStatus: "to_process",
      currency: (process.env.STRIPE_CURRENCY || "eur").toUpperCase(),
      createdAt: now,
      updatedAt: now,
    };

    await storage().saveOrder(order);

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: order.customer.email,
      client_reference_id: reference,
      success_url: `${baseUrl}/confirmation?reference=${reference}`,
      cancel_url: `${baseUrl}/annulation?reference=${reference}`,
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      line_items: [
        ...order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: process.env.STRIPE_CURRENCY || "eur",
            unit_amount: item.unitAmount,
            product_data: {
              name: item.productTitle,
              description: `${item.offerType} — référence ${reference}`,
            },
          },
        })),
        ...(order.shippingAmount > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: process.env.STRIPE_CURRENCY || "eur",
                  unit_amount: order.shippingAmount,
                  product_data: {
                    name: "Livraison",
                    description: `Livraison pour la demande ${reference}`,
                  },
                },
              },
            ]
          : []),
        ...(supportAmount > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: process.env.STRIPE_CURRENCY || "eur",
                  unit_amount: supportAmount,
                  product_data: {
                    name: "Participation complémentaire à l’association",
                    description: `Soutien complémentaire pour la référence ${reference}`,
                  },
                },
              },
            ]
          : []),
      ],
      metadata: {
        orderReference: reference,
        customerEmail: order.customer.email,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        totalAmount: String(order.totalAmount),
        supportAmount: String(supportAmount),
        destinationCode,
        containsShipping: String(Boolean(order.shippingAddress)),
        itemsCount: String(order.items.length),
        totalPhysicalQuantity: String(baseTotals.totalPhysicalQuantity),
      },
    });

    order.stripeSessionId = session.id;
    order.updatedAt = new Date().toISOString();

    await storage().updateOrder(reference, order);

    return NextResponse.json({ url: session.url, reference });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de lancer le checkout." },
      { status: 500 }
    );
  }
}