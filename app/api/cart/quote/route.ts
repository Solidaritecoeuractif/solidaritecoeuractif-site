
import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { resolveCart, computeTotals } from "@/lib/cart";
import { z } from "zod";

export async function POST(request: Request) {
  const payload = await request.json();
  const schema = z.object({
    items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive(), customAmount: z.number().int().positive().optional() })),
    country: z.string().optional()
  });
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  const products = await storage().getProducts();
  const cart = resolveCart(parsed.data.items, products);
  const totals = computeTotals(cart.items, parsed.data.country);
  return NextResponse.json({
    subtotalAmount: totals.subtotalAmount,
    shippingAmount: totals.shippingAmount,
    totalAmount: totals.totalAmount
  });
}
