import crypto from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "sca_admin_session";
const ORGANIZER_COOKIE_NAME = "sca_organizer_session";

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "change-me";
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

function timingSafeEqualText(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

function createSignedToken(value: string) {
  return `${value}.${sign(value)}`;
}

function verifySignedToken(token?: string) {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [value, signature] = parts;

  if (!value || !signature) return null;

  const expectedSignature = sign(value);

  if (!timingSafeEqualText(signature, expectedSignature)) {
    return null;
  }

  return value;
}

export async function createAdminSession() {
  const value = `admin:${Date.now()}`;
  const token = createSignedToken(value);
  const store = await cookies();

  store.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function destroyAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
}

export async function isAdminAuthenticated() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE_NAME)?.value;
  const value = verifySignedToken(token);

  return Boolean(value?.startsWith("admin:"));
}

export async function createOrganizerSession(organizerId: string) {
  const safeOrganizerId = String(organizerId || "").trim();

  if (!safeOrganizerId) {
    throw new Error("Identifiant organisateur manquant.");
  }

  const value = `organizer:${safeOrganizerId}:${Date.now()}`;
  const token = createSignedToken(value);
  const store = await cookies();

  store.set(ORGANIZER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function destroyOrganizerSession() {
  const store = await cookies();
  store.delete(ORGANIZER_COOKIE_NAME);
}

export async function getOrganizerSession() {
  const store = await cookies();
  const token = store.get(ORGANIZER_COOKIE_NAME)?.value;
  const value = verifySignedToken(token);

  if (!value || !value.startsWith("organizer:")) {
    return null;
  }

  const parts = value.split(":");
  const organizerId = parts[1];

  if (!organizerId) {
    return null;
  }

  return {
    organizerId,
  };
}

export async function isOrganizerAuthenticated() {
  const session = await getOrganizerSession();
  return Boolean(session?.organizerId);
}

export function hashPassword(password: string) {
  const cleanPassword = String(password || "");

  if (cleanPassword.length < 8) {
    throw new Error("Le mot de passe doit contenir au moins 8 caractères.");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .scryptSync(cleanPassword, salt, 64)
    .toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string) {
  const cleanPassword = String(password || "");
  const cleanStoredHash = String(storedHash || "");

  const parts = cleanStoredHash.split(":");

  if (parts.length !== 3) {
    return false;
  }

  const [method, salt, hash] = parts;

  if (method !== "scrypt" || !salt || !hash) {
    return false;
  }

  const attemptedHash = crypto
    .scryptSync(cleanPassword, salt, 64)
    .toString("hex");

  return timingSafeEqualText(attemptedHash, hash);
}