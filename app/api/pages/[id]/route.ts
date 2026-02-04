import { NextRequest, NextResponse } from "next/server";
import { getPrisma, D1BindingUnavailableError } from "@/lib/db";
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
    const prisma = getPrisma();
    const page = await prisma.page.findFirst({
      where: { id, deletedAt: null },
    });
    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers });
    }
    return NextResponse.json(page, { headers });
  } catch (e) {
    console.error(e);
    if (e instanceof D1BindingUnavailableError) {
      return NextResponse.json(
        { error: e.message },
        { status: 503, headers }
      );
    }
    return NextResponse.json(
      { error: "Failed to load page" },
      { status: 500, headers }
    );
  }
}

async function cascadeSoftDelete(prisma: ReturnType<typeof getPrisma>, id: string, deletedAt: Date) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400, headers });
  }
  try {
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

    const prisma = getPrisma();
    const page = await prisma.page.update({
      where: { id },
      data,
    });
    return NextResponse.json(page, { headers });
  } catch (e) {
    console.error(e);
    if (e instanceof D1BindingUnavailableError) {
      return NextResponse.json(
        { error: e.message },
        { status: 503, headers }
      );
    }
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500, headers }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = requireAuth(request);
  if (authErr) return authErr;
  const headers = new Headers();
  headers.set("Cache-Control", CACHE_NO_STORE);
  const id = (await params).id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400, headers });
  }
  try {
    const prisma = getPrisma();
    const deletedAt = new Date();
    await prisma.page.update({
      where: { id },
      data: { deletedAt },
    });
    await cascadeSoftDelete(prisma, id, deletedAt);
    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    console.error(e);
    if (e instanceof D1BindingUnavailableError) {
      return NextResponse.json(
        { error: e.message },
        { status: 503, headers }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500, headers }
    );
  }
}
