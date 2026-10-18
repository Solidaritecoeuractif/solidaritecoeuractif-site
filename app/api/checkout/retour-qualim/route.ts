import { stripe } from "@/lib/stripe";
import { storage } from "@/lib/storage";
import { handleQualimReturn } from "@/lib/qualim-return";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleQualimReturn(request, {
    enabled: process.env.QUALIM_RETURN_ENABLED === "true",
    retrieveSession: id => stripe().checkout.sessions.retrieve(id),
    getOrder: reference => storage().getOrderByReference(reference),
  });
}
