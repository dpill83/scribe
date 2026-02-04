import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getOptionalRequestContext } from "@cloudflare/next-on-pages";

declare global {
  // eslint-disable-next-line no-var
  var prismaLocal: PrismaClient | undefined;
}

/** Thrown when running on Cloudflare but the D1 binding is not available. */
export class D1BindingUnavailableError extends Error {
  constructor() {
    super(
      "D1 binding 'DB' is not available. Check Cloudflare Pages → Settings → Functions → D1 database bindings (variable name must be DB)."
    );
    this.name = "D1BindingUnavailableError";
  }
}

function createPrismaClient(): PrismaClient {
  const ctx = getOptionalRequestContext();
  const binding = ctx?.env?.DB as D1Database | undefined;
  if (binding) {
    const adapter = new PrismaD1(binding);
    return new PrismaClient({ adapter });
  }
  // On Cloudflare (context exists) but no DB binding → fail fast with clear error
  if (ctx !== undefined) {
    throw new D1BindingUnavailableError();
  }
  if (globalThis.prismaLocal) return globalThis.prismaLocal;
  globalThis.prismaLocal = new PrismaClient();
  return globalThis.prismaLocal;
}

export function getPrisma(): PrismaClient {
  return createPrismaClient();
}
