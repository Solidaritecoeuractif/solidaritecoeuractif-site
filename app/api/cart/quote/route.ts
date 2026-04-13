import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { resolveCart, computeTotals } from "@/lib/cart";
import { z } from "zod";

export async function POST(request: Request) {
  const payload = await request.json();

  const schema = z.object({
    items: z.array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        customAmount: z.number().int().positive().optional(),
      })
    ),
    country: z.string().optional(),
    supportEnabled: z.boolean().optional(),
    supportAmount: z.number().int().nonnegative().optional(),
  });

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const products = await storage().getProducts();
  const cart = resolveCart(parsed.data.items, products, parsed.data.country);

  if (cart.errors.length) {
    return NextResponse.json(
      { error: cart.errors.join(" ") },
      { status: 400 }
    );
  }

  const baseTotals = computeTotals(cart.items, parsed.data.country);

  const associationSupport =
    parsed.data.supportEnabled === false
      ? 0
      : Math.max(0, parsed.data.supportAmount || 0);

  return NextResponse.json({
    subtotalAmount: baseTotals.subtotalAmount,
    shippingAmount: baseTotals.shippingAmount,
    supportAmount: associationSupport,
    totalAmount: baseTotals.totalAmount + associationSupport,
  });
}