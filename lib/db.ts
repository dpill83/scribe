import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

export type CloudflareEnv = { DB?: D1Database };

declare global {
  // eslint-disable-next-line no-var
  var prismaLocal: PrismaClient | undefined;
}

/**
 * Returns a Prisma client for this request. On Cloudflare, pass env from getRequestContext();
 * env.DB must be the D1 binding. Local dev: pass undefined to use DATABASE_URL.
 * Prisma is created inside the request (no module-level instantiation).
 */
export function getPrisma(env?: CloudflareEnv): PrismaClient {
  const binding = env?.DB;
  if (binding) {
    const adapter = new PrismaD1(binding);
    return new PrismaClient({ adapter });
  }
  if (globalThis.prismaLocal) return globalThis.prismaLocal;
  globalThis.prismaLocal = new PrismaClient();
  return globalThis.prismaLocal;
}

/** Turns Prisma/D1 errors into a clear detail string; detects missing table. */
export function dbErrorDetail(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/no such table|does not exist|table .* not found/i.test(msg)) {
    return `D1 table missing: Page. Run: npx wrangler d1 execute scribe-db --remote --file=./prisma/migrations/20240203000000_init/migration.sql`;
  }
  return msg;
}
