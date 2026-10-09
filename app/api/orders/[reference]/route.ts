import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";

const VALID_LOGISTICS_STATUSES = new Set([
  "to_process", "prepared", "shipped", "delivered", "cancelled"
]);

// Cette route historique n'autorise AUCUNE modification de paiement.
// Seul un serveur après confirmation bancaire peut établir paymentStatus="paid".
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Demande invalide." }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;
  if (Object.keys(fields).length !== 1 ||
      typeof fields.logisticsStatus !== "string" ||
      !VALID_LOGISTICS_STATUSES.has(fields.logisticsStatus)) {
    return NextResponse.json(
      { error: "Seul le statut logistique peut être modifié ici." },
      { status: 400 }
    );
  }

  const { reference } = await params;
  const order = await storage().getOrderByReference(reference);
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
  }

  order.logisticsStatus = fields.logisticsStatus as typeof order.logisticsStatus;
  order.updatedAt = new Date().toISOString();
  await storage().updateOrder(reference, order);
  return NextResponse.json({ success: true, reference, logisticsStatus: order.logisticsStatus });
}
