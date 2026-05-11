import { NextResponse } from "next/server";
import { destroyOrganizerSession } from "@/lib/auth";

export async function POST(request: Request) {
  await destroyOrganizerSession();

  return NextResponse.redirect(
    new URL("/organisateur/connexion", request.url),
    { status: 303 }
  );
}

export async function GET(request: Request) {
  await destroyOrganizerSession();

  return NextResponse.redirect(
    new URL("/organisateur/connexion", request.url),
    { status: 303 }
  );
}