import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

declare global {
  // eslint-disable-next-line no-var
  var prismaLocal: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const ctx = getOptionalRequestContext();
  const binding = ctx?.env?.DB as D1Database | undefined;
  if (binding) {
    const adapter = new PrismaD1(binding);
    return new PrismaClient({ adapter });
  }
  if (globalThis.prismaLocal) return globalThis.prismaLocal;
  globalThis.prismaLocal = new PrismaClient();
  return globalThis.prismaLocal;
}

export function getPrisma(): PrismaClient {
  return createPrismaClient();
}
