import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAdminAuthenticated } from "@/lib/auth";
import { customerMessagesSchema } from "@/lib/customer-messages";
import { storage } from "@/lib/storage";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Accès refusé." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Origine de la requête non autorisée." }, { status: 403 });

  const parsed = customerMessagesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  try {
    await storage().saveCustomerMessages(parsed.data);
    revalidatePath("/admin/messages-clients");
    return NextResponse.json(parsed.data);
  } catch {
    return NextResponse.json({ error: "Le message n’a pas pu être enregistré. Réessayez." }, { status: 500 });
  }
}
