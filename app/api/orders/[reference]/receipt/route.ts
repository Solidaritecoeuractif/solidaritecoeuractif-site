import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { generatePaymentReceiptPdf } from "@/lib/payment-receipt";

// Les attestations contiennent des données personnelles : réservées à
// l'administration authentifiée et aux commandes réellement payées.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ reference: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Non autorisé." }, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" }
    });
  }

  const { reference } = await params;
  const order = await storage().getOrderByReference(reference);
  if (!order || order.paymentStatus !== "paid") {
    return NextResponse.json({ error: "Attestation indisponible." }, {
      status: 404,
      headers: { "Cache-Control": "private, no-store" }
    });
  }

  const pdf = await generatePaymentReceiptPdf(order);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestation-${order.reference}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    },
  });
}
