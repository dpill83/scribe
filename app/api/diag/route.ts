import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * Diagnostic route: reports Cloudflare request context and env bindings.
 * Does NOT import Prisma. Always returns JSON; never throws.
 */
export async function GET() {
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as unknown as Record<string, unknown> | undefined;
    const envKeys = env && typeof env === "object" ? Object.keys(env) : [];
    const hasDB = env != null && "DB" in env && env.DB != null;

    return NextResponse.json({
      contextExists: true,
      envDBExists: hasDB,
      envKeys,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const name = e instanceof Error ? e.name : "Error";
    return NextResponse.json({
      contextExists: false,
      envDBExists: false,
      envKeys: [],
      error: name,
      detail: message,
    });
  }
}
