import { NextRequest, NextResponse } from "next/server";
import {
  getEditPassword,
  verifyPassword,
  setAuthCookieHeaders,
  clearAuthCookieHeaders,
  isAuthRequired,
} from "@/lib/auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { env } = getCloudflareContext();
  const envTyped = env as { EDIT_PASSWORD?: string } | undefined;
  if (!isAuthRequired(envTyped)) {
    return NextResponse.json({ ok: true });
  }
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyPassword(password, envTyped)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const headers = setAuthCookieHeaders();
  return NextResponse.json({ ok: true }, { headers });
}

export async function DELETE() {
  const headers = clearAuthCookieHeaders();
  return NextResponse.json({ ok: true }, { headers });
}

export async function GET() {
  const { env } = getCloudflareContext();
  const envTyped = env as { EDIT_PASSWORD?: string } | undefined;
  const required = isAuthRequired(envTyped);
  return NextResponse.json({
    required,
    hasPassword: !!getEditPassword(envTyped),
  });
}
