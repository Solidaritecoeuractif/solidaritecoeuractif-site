import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "sca_admin_session";

async function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "change-me";
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function isValidAdminSession(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [value, signature] = parts;
  if (!value || !signature) return false;

  // Un jeton valide d'organisateur ne doit jamais servir d'accès admin.
  if (!/^admin:\d{13}$/.test(value)) return false;
  const issuedAt = Number(value.slice(6));
  const age = Date.now() - issuedAt;
  if (age < -60_000 || age > 12 * 60 * 60 * 1000) return false;

  // Une clé de démonstration ne peut pas sécuriser l'administration publique.
  if (process.env.NODE_ENV === "production" &&
      (!process.env.ADMIN_SESSION_SECRET ||
       new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET).byteLength < 32)) {
    return false;
  }
  const expected = await sign(value);
  return expected === signature;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute =
    pathname === "/admin" || pathname.startsWith("/admin/");

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  const authenticated = await isValidAdminSession(request);

  if (authenticated) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin-login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};