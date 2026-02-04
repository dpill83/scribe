import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * Diagnostic route: reports Cloudflare env.DB. No Prisma import.
 * Always returns JSON; never throws. Wrapped in try/catch with [api] logging.
 */
export async function GET() {
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as unknown as Record<string, unknown> | undefined;
    const hasDB = env != null && typeof env === "object" && "DB" in env && env.DB != null;

    return NextResponse.json({
      hasDB: !!hasDB,
      contextExists: true,
      envDBExists: !!hasDB,
      envKeys: env && typeof env === "object" ? Object.keys(env) : [],
    });
  } catch (err) {
    console.error("[api]", err);
    const name = err instanceof Error ? err.name : "Error";
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Diag failed", detail, name, hasDB: false },
      { status: 500 }
    );
  }
}
