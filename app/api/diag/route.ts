import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";
export const runtime = "edge";

/**
 * Diagnostic route: reports Cloudflare env.DB. No Prisma import.
 * Always returns JSON; never throws. Wrapped in try/catch with [api] logging.
 */
export async function GET() {
  try {
    const { env } = getCloudflareContext();
    const envObj = env as unknown as Record<string, unknown> | undefined;
    const hasDB = envObj != null && typeof envObj === "object" && "DB" in envObj && envObj.DB != null;

    return NextResponse.json({
      hasDB: !!hasDB,
      contextExists: true,
      envDBExists: !!hasDB,
      envKeys: envObj && typeof envObj === "object" ? Object.keys(envObj) : [],
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
