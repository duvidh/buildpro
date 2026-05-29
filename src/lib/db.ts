import { PrismaClient } from "@/generated/prisma/client";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Guard: catch misconfiguration early with a clear message rather than a
// cryptic "wss://localhost/v2 ECONNREFUSED" at runtime.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "[db] DATABASE_URL is not set. " +
      "Add it to .env.local (dev) or as a Vercel Environment Variable (prod)."
  );
}

// Only inject the `ws` polyfill when native WebSocket is unavailable.
// Vercel Node.js 22+ ships native WebSocket — unconditionally overriding it
// with the `ws` npm package caused the driver to target wss://localhost/v2.
if (!("WebSocket" in globalThis)) {
  neonConfig.webSocketConstructor = ws;
}

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
