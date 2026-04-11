import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function PATCH(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const body = await request.json();
  const order = await storage().getOrderByReference(reference);
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  if (body.paymentStatus) order.paymentStatus = body.paymentStatus;
  if (body.logisticsStatus) order.logisticsStatus = body.logisticsStatus;
  order.updatedAt = new Date().toISOString();
  await storage().updateOrder(reference, order);
  return NextResponse.json(order);
}
