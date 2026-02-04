import { NextRequest, NextResponse } from "next/server";
import { getPrisma, D1BindingUnavailableError } from "@/lib/db";
import { buildTree } from "@/lib/tree";
import { isAuthRequired, isAuthenticatedFromRequest } from "@/lib/auth";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const CACHE_NO_STORE = "no-store";

function requireAuth(request: NextRequest): NextResponse | null {
  const ctx = getOptionalRequestContext();
  const env = ctx?.env as { EDIT_PASSWORD?: string } | undefined;
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
    const prisma = getPrisma();
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
    console.error(e);
    if (e instanceof D1BindingUnavailableError) {
      return NextResponse.json(
        { error: e.message },
        { status: 503, headers }
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to list pages", detail: message },
      { status: 500, headers }
    );
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  try {
    const body = (await request.json().catch(() => ({}))) as { parentId?: string; title?: string };
    const parentId =
      typeof body.parentId === "string" ? body.parentId : undefined;
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Untitled";

    const prisma = getPrisma();
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
    console.error(e);
    if (e instanceof D1BindingUnavailableError) {
      return NextResponse.json(
        { error: e.message },
        { status: 503, headers }
      );
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create page", detail: message },
      { status: 500, headers }
    );
  }
}
