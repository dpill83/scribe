import { NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { PrismaClient } from "@prisma/client";
import { getPrisma, dbErrorDetail } from "@/lib/db";
import type { CloudflareEnv } from "@/lib/db";
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

async function cascadeSoftDelete(prisma: PrismaClient, id: string, deletedAt: Date) {
  const children = await prisma.page.findMany({
    where: { parentId: id, deletedAt: null },
  });
  for (const c of children) {
    await prisma.page.update({
      where: { id: c.id },
      data: { deletedAt },
    });
    await cascadeSoftDelete(prisma, c.id, deletedAt);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400, headers });
  }
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as CloudflareEnv & { EDIT_PASSWORD?: string } | undefined;
    console.error("[pages-api] env.DB present:", !!env?.DB);

    const prisma = getPrisma(env);
    const page = await prisma.page.findFirst({
      where: { id, deletedAt: null },
    });
    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    }
    return NextResponse.json(page, { headers });
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[pages-api]", name, message);

    const detail = dbErrorDetail(e);
    const body: { error: string; detail: string; stack?: string } = {
      error: "Failed to load page",
      detail,
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error && e.stack) {
      body.stack = e.stack;
    }
    return NextResponse.json(body, { status: 500, headers });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400, headers });
  }
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as CloudflareEnv & { EDIT_PASSWORD?: string } | undefined;
    console.error("[pages-api] env.DB present:", !!env?.DB);

    const authErr = requireAuth(request, env);
    if (authErr) return authErr;

    const prisma = getPrisma(env);
    const body = (await request.json().catch(() => ({}))) as {
      title?: string;
      parentId?: string | null;
      sortOrder?: number;
      contentJson?: string;
    };
    const data: { title?: string; parentId?: string | null; sortOrder?: number; contentJson?: string } = {};
    if (typeof body.title === "string") data.title = body.title;
    if (body.parentId !== undefined) data.parentId = body.parentId === null || body.parentId === "" ? null : body.parentId;
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
    if (typeof body.contentJson === "string") data.contentJson = body.contentJson;

    const page = await prisma.page.update({
      where: { id },
      data,
    });
    return NextResponse.json(page, { headers });
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[pages-api]", name, message);

    const detail = dbErrorDetail(e);
    const body: { error: string; detail: string; stack?: string } = {
      error: "Failed to update page",
      detail,
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error && e.stack) {
      body.stack = e.stack;
    }
    return NextResponse.json(body, { status: 500, headers });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400, headers });
  }
  try {
    const ctx = getRequestContext();
    const env = ctx?.env as CloudflareEnv & { EDIT_PASSWORD?: string } | undefined;
    console.error("[pages-api] env.DB present:", !!env?.DB);

    const authErr = requireAuth(request, env);
    if (authErr) return authErr;

    const prisma = getPrisma(env);
    const deletedAt = new Date();
    await prisma.page.update({
      where: { id },
      data: { deletedAt },
    });
    await cascadeSoftDelete(prisma, id, deletedAt);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    const message = e instanceof Error ? e.message : String(e);
    console.error("[pages-api]", name, message);

    const detail = dbErrorDetail(e);
    const body: { error: string; detail: string; stack?: string } = {
      error: "Failed to delete page",
      detail,
    };
    if (process.env.NODE_ENV === "development" && e instanceof Error && e.stack) {
      body.stack = e.stack;
    }
    return NextResponse.json(body, { status: 500, headers });
  }
}
