import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";

const VALID_LOGISTICS_STATUSES = new Set([
  "to_process", "prepared", "shipped", "delivered", "cancelled"
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }
  const { reference } = await params;
  const formData = await request.formData();

  // Une modification manuelle des statuts de paiement est interdite :
  // seule la confirmation signée de Stripe peut établir le paiement.
  if (formData.has("paymentStatus")) {
    return NextResponse.json({ error: "Le paiement ne se modifie pas manuellement." }, { status: 403 });
  }
  const status = formData.get("logisticsStatus");
  if (typeof status !== "string" || !VALID_LOGISTICS_STATUSES.has(status)) {
    return NextResponse.json({ error: "Statut logistique invalide." }, { status: 400 });
  }

  const order = await storage().getOrderByReference(reference);
  if (!order) return NextResponse.redirect(new URL("/admin/orders", request.url));
  order.logisticsStatus = status as typeof order.logisticsStatus;
  order.updatedAt = new Date().toISOString();
  await storage().updateOrder(reference, order);
  return NextResponse.redirect(new URL(`/admin/orders/${reference}`, request.url));
}
