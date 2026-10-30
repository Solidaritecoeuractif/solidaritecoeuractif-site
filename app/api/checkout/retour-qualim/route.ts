import { stripe } from "@/lib/stripe";
import { storage } from "@/lib/storage";
import { ticketingStorage } from "@/lib/ticketing";
import { handleQualimReturn } from "@/lib/qualim-return";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleQualimReturn(request, {
    retrieveSession: id => stripe().checkout.sessions.retrieve(id),
    getOrder: reference => storage().getOrderByReference(reference),
    getTicketingOrder: reference => ticketingStorage().getTicketingOrderByReference(reference),
  });
}
