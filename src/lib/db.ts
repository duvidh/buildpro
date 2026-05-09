import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

function createPrismaClient() {
  const raw = process.env.DATABASE_URL ?? "dev.db";
  // better-sqlite3 needs a plain path, not the "file:" URI scheme
  const url = raw.startsWith("file:") ? raw.slice(5) : raw;
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
