// Fixed destinations only: no caller-supplied return URL or customer data leaves SCA.
export const QUALIM_COOKIE = "sca_qualim_365";
export const QUALIM_BOOK_ID = "prod_book_365";
export const QUALIM_RETURN_URL = "https://quali-m-consult.com/boutique?retour=365";
export const QUALIM_RETURN_PATH = "/api/checkout/retour-qualim";

export function qualimCheckoutOptions(
  baseUrl: string,
  reference: string,
  cookie: string | undefined,
  productIds: string[],
  enabled: boolean
): { success_url: string; metadata: Record<string, string> } {
  const eligible = enabled && cookie === "1" && productIds.includes(QUALIM_BOOK_ID);
  return {
    success_url: eligible
      ? `${baseUrl}${QUALIM_RETURN_PATH}?session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/confirmation?reference=${encodeURIComponent(reference)}`,
    metadata: eligible ? { returnPartner: "qualim", returnProductId: QUALIM_BOOK_ID } : {},
  };
}

type ReturnSession = {
  id: string;
  status: string | null;
  payment_status: string;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
};
type ReturnOrder = {
  reference: string;
  stripeSessionId?: string;
  paymentStatus: string;
  items: { productId?: string }[];
};
type Dependencies = {
  enabled: boolean;
  retrieveSession: (id: string) => Promise<ReturnSession>;
  getOrder: (reference: string) => Promise<ReturnOrder | undefined>;
};

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function notice(message: string, status: number, refresh?: string) {
  // Messages are internal constants; refresh contains only a validated Stripe ID and counter.
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refresh ? `<meta http-equiv="refresh" content="5;url=${refresh.replaceAll("&", "&amp;")}">` : ""}<title>Votre commande — Solidarité Cœur Actif</title></head><body><main><h1>Votre commande</h1><p>${message}</p></main></body></html>`, {
    status,
    headers: { ...privateHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

function retry(requestUrl: URL, sessionId: string) {
  const rawAttempt = requestUrl.searchParams.get("attempt") || "0";
  const attempt = /^\d{1,2}$/.test(rawAttempt) ? Number(rawAttempt) : 60;
  const refresh = attempt < 60
    ? `${QUALIM_RETURN_PATH}?session_id=${sessionId}&attempt=${attempt + 1}`
    : undefined;
  return notice(
    refresh
      ? "Nous vérifions la confirmation de votre paiement. Cette page se met à jour automatiquement."
      : "La confirmation prend plus de temps que prévu. Vous pouvez actualiser cette page ultérieurement. Ne recommencez pas le paiement ; contactez-nous en cas de doute.",
    202,
    refresh
  );
}

export async function handleQualimReturn(request: Request, deps: Dependencies) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!/^cs_(?:test|live)_[A-Za-z0-9]{8,200}$/.test(sessionId)) {
    return notice("Ce lien de retour est invalide.", 400);
  }

  let session: ReturnSession;
  let order: ReturnOrder | undefined;
  try {
    session = await deps.retrieveSession(sessionId);
    if (
      session.id !== sessionId ||
      session.metadata?.returnPartner !== "qualim" ||
      session.metadata?.returnProductId !== QUALIM_BOOK_ID ||
      !session.client_reference_id
    ) return notice("Ce lien ne correspond pas à ce parcours de commande.", 404);
    order = await deps.getOrder(session.client_reference_id);
  } catch {
    // A transient Stripe/database failure must never claim success or expose provider details.
    return retry(url, sessionId);
  }

  if (!order || order.reference !== session.client_reference_id ||
    (order.stripeSessionId && order.stripeSessionId !== sessionId) ||
    !order.items.some(item => item.productId === QUALIM_BOOK_ID)) {
    return notice("Impossible de rattacher ce paiement à votre commande.", 404);
  }
  if (session.status === "expired" || order.paymentStatus === "cancelled") {
    return notice("Ce paiement n’a pas été confirmé.", 409);
  }
  if (session.status !== "complete" || session.payment_status !== "paid" ||
    order.paymentStatus !== "paid" || order.stripeSessionId !== sessionId) {
    // Wait for the existing webhook: this route neither writes orders nor sends emails.
    return retry(url, sessionId);
  }

  const destination = deps.enabled
    ? QUALIM_RETURN_URL
    : new URL(`/confirmation?reference=${encodeURIComponent(order.reference)}`, url.origin).href;
  return new Response(null, {
    status: 303,
    headers: {
      ...privateHeaders,
      Location: destination,
      "Set-Cookie": `${QUALIM_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`,
    },
  });
}
