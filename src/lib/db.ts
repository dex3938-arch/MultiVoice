import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * One Prisma client per process. With connection_limit=1 every query waits for the previous one, so pages
 * that run several queries in parallel would make one round trip after another. Supabase's pooler (6543)
 * handles many clients: 5 per Vercel instance, 10 elsewhere. Override with DB_CONNECTION_LIMIT.
 */
function databaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const limit = process.env.DB_CONNECTION_LIMIT ?? (process.env.VERCEL ? "5" : "10");
  return url.replace(/([?&]connection_limit=)1(?!\d)/, `$1${limit}`);
}

const g = globalThis as unknown as { prisma?: PrismaClient };
const url = databaseUrl();
export const prisma =
  g.prisma ??
  new PrismaClient({ ...(url ? { datasources: { db: { url } } } : {}), log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
g.prisma = prisma;
