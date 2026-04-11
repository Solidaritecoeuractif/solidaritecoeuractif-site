import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const formData = await request.formData();
  const order = await storage().getOrderByReference(reference);
  if (!order) return NextResponse.redirect(new URL('/admin/orders', request.url));
  order.paymentStatus = String(formData.get('paymentStatus') || order.paymentStatus) as any;
  order.logisticsStatus = String(formData.get('logisticsStatus') || order.logisticsStatus) as any;
  order.updatedAt = new Date().toISOString();
  await storage().updateOrder(reference, order);
  return NextResponse.redirect(new URL(`/admin/orders/${reference}`, request.url));
}
