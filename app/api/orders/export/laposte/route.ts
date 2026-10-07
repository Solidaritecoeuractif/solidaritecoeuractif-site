import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { prepareLaPosteExport } from "@/lib/laposte-export";
import { laPosteWorkbook } from "@/lib/laposte-workbook";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noCache = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noCache });

/** Export en lecture seule, réservé à la session administrateur.
 * Références explicites obligatoires : jamais d'export de toutes les commandes par défaut.
 * Aucune référence introuvable, impayée ou invalide n'est omise silencieusement.
 */
export async function POST(request: Request) {
  if (!process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET === "change-me") return json({ error: "Configurer ADMIN_SESSION_SECRET avant d'utiliser cet export." }, 503);
  if (!(await isAdminAuthenticated())) return json({ error: "Session administrateur requise. Reconnectez-vous à SCA." }, 401);
  if (Number(request.headers.get("content-length") || 0) > 512_000) return json({ error: "Sélection trop volumineuse." }, 413);
  let body: { references?: unknown; mode?: unknown; acknowledgeShipped?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 512_000) return json({ error: "Sélection trop volumineuse." }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: "Demande illisible." }, 400); }
  if (!body || !Array.isArray(body.references) || !body.references.length || body.references.length > 5000 || body.references.some(r => typeof r !== "string" || !r.trim() || r.length > 160)) return json({ error: "Sélectionner entre 1 et 5 000 références valides." }, 400);
  const refs = body.references.map(r => (r as string).trim());
  if (new Set(refs).size !== refs.length) return json({ error: "Références dupliquées dans la sélection." }, 400);
  if (body.mode !== "preview" && body.mode !== "xlsx") return json({ error: "Mode d'export inconnu." }, 400);
  try {
    const all = await storage().getOrders();
    const wanted = new Set(refs);
    const byRef = new Map<string, Order>();
    for (const order of all) if (wanted.has(order.reference)) {
      if (byRef.has(order.reference)) return json({ error: "Référence dupliquée dans les commandes : " + order.reference }, 409);
      byRef.set(order.reference, order);
    }
    const missing = refs.filter(ref => !byRef.has(ref));
    if (missing.length) return json({ error: "Commandes introuvables. Aucune sélection partielle n'a été exportée.", issues: missing.map(reference => ({ reference, field: "Référence", message: "Commande introuvable." })) }, 422);
    const selected = refs.map(ref => byRef.get(ref)!);
    const data = prepareLaPosteExport(selected);
    const summary = { count: data.preview.length, preview: data.preview, issues: data.issues, customs: data.customs, mixed: data.mixed };
    if (body.mode === "preview") return json(summary);
    if (data.issues.length) return json({ ...summary, error: "Corriger les lignes signalées avant l'export. Toutes les commandes sont conservées." }, 422);
    if (data.preview.some(p => p.alreadyShipped) && body.acknowledgeShipped !== true) return json({ ...summary, error: "Des commandes sont déjà expédiées/livrées : confirmer qu'il s'agit d'une réédition, sans nouvel achat en double." }, 409);
    const bytes = await laPosteWorkbook(data);
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const payload = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(payload).set(bytes);
    return new NextResponse(payload, { headers: { ...noCache, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="SCA_LaPoste_${date}_${data.rows.length}_envois.xlsx"` } });
  } catch (e) {
    // Aucun contenu de commande, téléphone, e-mail ni secret dans les journaux.
    console.error("LaPoste export failed", e instanceof Error ? e.name : "unknown");
    return json({ error: "Impossible de préparer cet export. Aucune commande n'a été modifiée." }, 500);
  }
}
