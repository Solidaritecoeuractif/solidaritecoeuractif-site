
import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") || "");
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.redirect(new URL("/admin-login", request.url));
  }
  await createAdminSession();
  return NextResponse.redirect(new URL("/admin", request.url));
}
