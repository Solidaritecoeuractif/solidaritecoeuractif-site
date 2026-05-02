import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";
import type { Order } from "@/lib/types";

export async function POST(request: Request) {
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const reference = String(body?.reference || "").trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Référence de commande manquante." },
        { status: 400 }
      );
    }

    const order = await storage().getOrderByReference(reference);

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable." },
        { status: 404 }
      );
    }

    const updatedOrder: Order = {
      ...order,
      paymentStatus: "cancelled",
      logisticsStatus: "cancelled",
      updatedAt: new Date().toISOString(),
    };

    await storage().updateOrder(reference, updatedOrder);

    return NextResponse.json({
      success: true,
      reference,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de supprimer la commande." },
      { status: 500 }
    );
  }
}