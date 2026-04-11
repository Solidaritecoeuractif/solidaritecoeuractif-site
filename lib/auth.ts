
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "sca_admin_session";

function sign(value: string) {
  const secret = process.env.ADMIN_SESSION_SECRET || "change-me";
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export async function createAdminSession() {
  const value = `admin:${Date.now()}`;
  const token = `${value}.${sign(value)}`;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [value, signature] = token.split(".");
  return sign(value) === signature;
}
