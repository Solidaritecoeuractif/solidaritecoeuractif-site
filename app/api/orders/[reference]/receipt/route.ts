import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { generatePaymentReceiptPdf } from "@/lib/payment-receipt";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const orders = await storage().getOrders();
  const order = orders.find((entry) => entry.reference === reference);

  if (!order) {
    return NextResponse.json(
      { error: "Commande introuvable." },
      { status: 404 }
    );
  }

  const pdf = await generatePaymentReceiptPdf(order);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestation-${order.reference}.pdf"`,
    },
  });
}