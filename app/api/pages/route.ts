import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getPrisma, dbErrorDetail } from "@/lib/db";
import type { CloudflareEnv } from "@/lib/db";
import { buildTree } from "@/lib/tree";
import { isAuthRequired, isAuthenticatedFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const CACHE_NO_STORE = "no-store";

function requireAuth(request: NextRequest, env?: CloudflareEnv & { EDIT_PASSWORD?: string }): NextResponse | null {
  if (!isAuthRequired(env)) return null;
  if (!isAuthenticatedFromRequest(request, env)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as CloudflareEnv & { EDIT_PASSWORD?: string } | undefined;
    console.error("[pages-api] env.DB present:", !!env?.DB);

    const prisma = getPrisma(env);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const flat = searchParams.get("flat") === "1";

    const pages = await prisma.page.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? { title: { contains: search } }
          : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    if (flat) {
      return NextResponse.json(pages, { headers });
    }
    const tree = buildTree(pages);
    return NextResponse.json(tree, { headers });
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[pages-api]", name, message);

    const detail = dbErrorDetail(e);
    const body: { error: string; detail: string; stack?: string } = {
      error: "Failed to list pages",
      detail,
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error && e.stack) {
      body.stack = e.stack;
    }
    return NextResponse.json(body, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as CloudflareEnv & { EDIT_PASSWORD?: string } | undefined;
    console.error("[pages-api] env.DB present:", !!env?.DB);

    const authErr = requireAuth(request, env);
    if (authErr) return authErr;

    const prisma = getPrisma(env);
    const body = (await request.json().catch(() => ({}))) as { parentId?: string; title?: string };
    const parentId =
      typeof body.parentId === "string" ? body.parentId : undefined;
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Untitled";

    const maxOrder = await prisma.page.aggregate({
      _max: { sortOrder: true },
      where: {
        parentId: parentId ?? null,
        deletedAt: null,
      },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const page = await prisma.page.create({
      data: { title, parentId: parentId ?? null, sortOrder },
    });
    return NextResponse.json(page, { status: 201, headers });
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[pages-api]", name, message);

    const detail = dbErrorDetail(e);
    const body: { error: string; detail: string; stack?: string } = {
      error: "Failed to create page",
      detail,
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error && e.stack) {
      body.stack = e.stack;
    }
    return NextResponse.json(body, { status: 500, headers });
  }
}
