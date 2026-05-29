/**
 * One-shot script to upsert a test admin user into the database.
 *
 * Usage:
 *   npx tsx scripts/create-dummy-admin.ts
 *
 * Prerequisites:
 *   • DATABASE_URL must be available in .env or .env.local
 *   • The Prisma client must already be generated  (npm run build, or: npx prisma generate)
 *
 * Safe to run multiple times — uses upsert, so it only updates if the
 * email already exists instead of throwing a unique-constraint error.
 */

import "dotenv/config"; // loads .env  (add dotenv.config({ path: ".env.local" }) below if needed)

import bcrypt from "bcryptjs";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

// ─── Neon / Prisma setup (mirrors src/lib/db.ts) ─────────────────────────────

if (!process.env.DATABASE_URL) {
  console.error(
    "\n❌  DATABASE_URL is not set.\n" +
      "    Add it to your .env (or .env.local) file and try again.\n"
  );
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

// ─── Seed data ────────────────────────────────────────────────────────────────

const EMAIL    = "admin@test.com";
const PASSWORD = "Password123!";
const NAME     = "David Admin";
const ROLE     = "ADMIN" as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔑  Hashing password…`);
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log(`📦  Upserting user: ${EMAIL}`);
  const user = await db.user.upsert({
    where:  { email: EMAIL },
    update: {
      name: NAME,
      passwordHash,
      role:   ROLE,
      active: true,
    },
    create: {
      email: EMAIL,
      name:  NAME,
      passwordHash,
      role:   ROLE,
      active: true,
    },
  });

  console.log("\n✅  Admin user ready!");
  console.log(`    ID:       ${user.id}`);
  console.log(`    Name:     ${user.name}`);
  console.log(`    Email:    ${user.email}`);
  console.log(`    Role:     ${user.role}`);
  console.log(`    Active:   ${user.active}`);
  console.log("\n    ──── Login credentials ────");
  console.log(`    Email:    ${EMAIL}`);
  console.log(`    Password: ${PASSWORD}\n`);
}

main()
  .catch((err) => {
    console.error("\n❌  Script failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
