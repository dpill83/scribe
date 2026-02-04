import { NextRequest, NextResponse } from "next/server";
import {
  getEditPassword,
  verifyPassword,
  setAuthCookieHeaders,
  clearAuthCookieHeaders,
  isAuthRequired,
} from "@/lib/auth";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function POST(request: NextRequest) {
  const ctx = getOptionalRequestContext();
  const env = ctx?.env as { EDIT_PASSWORD?: string } | undefined;
  if (!isAuthRequired(env)) {
    return NextResponse.json({ ok: true });
  }
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = typeof body.password === "string" ? body.password : "";
  if (!verifyPassword(password, env)) {
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
  const ctx = getOptionalRequestContext();
  const env = ctx?.env as { EDIT_PASSWORD?: string } | undefined;
  const required = isAuthRequired(env);
  return NextResponse.json({
    required,
    hasPassword: !!getEditPassword(env),
  });
}
