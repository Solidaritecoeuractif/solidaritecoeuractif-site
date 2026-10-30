// Fixed destinations only: no caller-supplied return URL or customer data leaves SCA.
export const QUALIM_COOKIE = "sca_qualim_365";
export const QUALIM_BOOK_ID = "prod_book_365";
export const QUALIM_RETURN_URL = "https://quali-m-consult.com/boutique";
export const QUALIM_RETURN_PATH = "/api/checkout/retour-qualim";

export function qualimCheckoutOptions(baseUrl: string): {
  success_url: string; metadata: Record<string, string>;
} {
  return {
    success_url: `${baseUrl}${QUALIM_RETURN_PATH}?session_id={CHECKOUT_SESSION_ID}`,
    metadata: { returnPartner: "qualim" },
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
  eventId?: string;
};
type Dependencies = {
  retrieveSession: (id: string) => Promise<ReturnSession>;
  getOrder: (reference: string) => Promise<ReturnOrder | undefined>;
  getTicketingOrder?: (reference: string) => Promise<ReturnOrder | undefined>;
};

const validSessionId = (value: string) => /^cs_(?:test|live)_[A-Za-z0-9]{8,200}$/.test(value);

// Older Stripe sessions still point to the original confirmation pages.
// Resolve their stored session, then use exactly the same payment checks.
export function legacyQualimReturnPath(reference: string, order?: ReturnOrder): string | null {
  return reference && order?.reference === reference && order.stripeSessionId && validSessionId(order.stripeSessionId)
    ? `${QUALIM_RETURN_PATH}?session_id=${encodeURIComponent(order.stripeSessionId)}`
    : null;
}

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function notice(message: string, status: number, refresh?: string, confirmation?: {
  reference: string; title: string; eventTitle?: string; secure: boolean;
}) {
  const title = confirmation?.title || "Votre commande";
  return new Response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refresh ? `<meta http-equiv="refresh" content="5;url=${escapeHtml(refresh)}">` : ""}<title>${escapeHtml(title)} — Solidarité Cœur Actif</title><style>body{margin:0;background:#f7f8fb;color:#182333;font-family:system-ui,sans-serif;line-height:1.65}main{box-sizing:border-box;max-width:660px;margin:12vh auto;padding:36px;background:#fff;border:1px solid #e1e6ed;border-radius:18px}h1{line-height:1.2;font-size:30px}.brand{font-size:13px;font-weight:700;letter-spacing:.08em;color:#606d82}a{display:inline-block;margin-top:12px;padding:12px 20px;background:#202e48;color:#fff;border-radius:8px;text-decoration:none;font-weight:650}@media(max-width:700px){main{margin:24px 16px;padding:24px}}</style></head><body><main><p class="brand">SOLIDARITÉ CŒUR ACTIF</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${confirmation ? `${confirmation.eventTitle ? `<p>${escapeHtml(confirmation.eventTitle)}</p>` : ""}<p><strong>Référence :</strong> ${escapeHtml(confirmation.reference)}</p><p>La boutique de notre partenaire <strong>Quali‑M Consult</strong> s’ouvrira automatiquement dans quelques secondes.</p><a href="${QUALIM_RETURN_URL}" rel="noreferrer">Ouvrir la boutique Quali‑M</a>` : ""}</main></body></html>`, {
    status,
    headers: {
      ...privateHeaders,
      "Content-Type": "text/html; charset=utf-8",
      ...(confirmation ? { "Set-Cookie": `${QUALIM_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${confirmation.secure ? "; Secure" : ""}` } : {}),
    },
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
  if (!validSessionId(sessionId)) {
    return notice("Ce lien de retour est invalide.", 400);
  }

  let session: ReturnSession;
  let order: ReturnOrder | undefined;
  try {
    session = await deps.retrieveSession(sessionId);
    if (
      session.id !== sessionId ||
      !session.client_reference_id
    ) return notice("Ce lien ne correspond pas à ce parcours de commande.", 404);
    if (session.metadata?.checkoutType === "ticketing") {
      if (!deps.getTicketingOrder || session.metadata.ticketingReference !== session.client_reference_id || !session.metadata.eventId) {
        return notice("Ce lien ne correspond pas à cette inscription.", 404);
      }
      order = await deps.getTicketingOrder(session.client_reference_id);
      if (!order?.eventId || order.eventId !== session.metadata.eventId) {
        return notice("Impossible de rattacher ce paiement à votre inscription.", 404);
      }
    } else {
      if (session.metadata?.checkoutType || (session.metadata?.orderReference && session.metadata.orderReference !== session.client_reference_id)) {
        return notice("Ce lien ne correspond pas à ce parcours de commande.", 404);
      }
      order = await deps.getOrder(session.client_reference_id);
    }
  } catch {
    // A transient Stripe/database failure must never claim success or expose provider details.
    return retry(url, sessionId);
  }

  if (!order || order.reference !== session.client_reference_id ||
    (order.stripeSessionId && order.stripeSessionId !== sessionId)) {
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

  const isTicketing = session.metadata?.checkoutType === "ticketing";
  return notice(
    isTicketing
      ? "Votre paiement a bien été reçu et votre inscription est enregistrée."
      : "Votre paiement a bien été reçu et votre commande est enregistrée.",
    200,
    QUALIM_RETURN_URL,
    {
      reference: order.reference,
      title: isTicketing ? "Inscription confirmée" : "Commande confirmée",
      eventTitle: isTicketing ? session.metadata?.eventTitle : undefined,
      secure: url.protocol === "https:",
    }
  );
}
