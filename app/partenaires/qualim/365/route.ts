import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { QUALIM_BOOK_ID, QUALIM_COOKIE } from "@/lib/qualim-return";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const product = await storage().getProductById(QUALIM_BOOK_ID);
  if (!product?.isActive || !product.isPhysical) {
    return new Response("Ce livre est momentanément indisponible.", { status: 404 });
  }
  const response = NextResponse.redirect(
    new URL(`/produit/${encodeURIComponent(product.slug)}`, request.url), 303
  );
  response.cookies.set(QUALIM_COOKIE, "1", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 7200,
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
