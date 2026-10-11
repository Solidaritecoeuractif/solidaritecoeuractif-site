import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readDigitalVisibility, writeDigitalVisibility } from "@/lib/sevlogos-publication";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Accès administrateur requis." },
      { status: 401, headers });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origine non autorisée." },
      { status: 403, headers });
  }
  let form: FormData;
  try { form = await request.formData(); }
  catch {
    return NextResponse.json({ error: "Formulaire invalide." },
      { status: 400, headers });
  }
  const keys = [...form.keys()].sort().join(",");
  const mode = form.get("visibility");
  const confirmation = form.get("confirmation");
  const validEnable = mode === "enable" &&
    confirmation === "ACTIVER" &&
    keys === "confirmation,visibility";
  const validDisable = mode === "disable" && keys === "visibility";
  if (!validEnable && !validDisable) {
    return NextResponse.json({ error: "Confirmation manuelle requise." },
      { status: 400, headers });
  }
  try {
    const current = await readDigitalVisibility();
    if (!current.ready) throw new Error("Missing visibility table");
    await writeDigitalVisibility(validEnable);
    return NextResponse.redirect(new URL("/admin/numerique?updated=1", request.url), 303);
  } catch {
    return NextResponse.redirect(new URL("/admin/numerique?error=1", request.url), 303);
  }
}
