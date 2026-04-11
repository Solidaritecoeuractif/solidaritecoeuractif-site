import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const references = Array.isArray(json?.references) ? json.references : [];

    if (references.length === 0) {
      return NextResponse.json({ error: "Aucune commande sélectionnée." }, { status: 400 });
    }

    await storage().markOrdersExported(references, new Date().toISOString());

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Impossible de marquer les commandes comme exportées." },
      { status: 500 }
    );
  }
}