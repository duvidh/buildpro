/**
 * Run once to create the first admin user:
 *   npx tsx scripts/seed-admin.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import ws from "ws";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

neonConfig.webSocketConstructor = ws;

const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const EMAIL    = "admin@buildpro.co.il";
const PASSWORD = "Admin1234!";
const NAME     = "מנהל מערכת";

async function main() {
  const existing = await db.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.log(`✓ משתמש כבר קיים: ${EMAIL}`);
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await db.user.create({
    data: {
      email: EMAIL,
      name:  NAME,
      passwordHash,
      role:   "ADMIN",
      active: true,
    },
  });

  console.log("\n✅ משתמש נוצר בהצלחה!");
  console.log(`   שם:     ${user.name}`);
  console.log(`   אימייל: ${user.email}`);
  console.log(`   סיסמה:  ${PASSWORD}`);
  console.log(`   תפקיד:  ${user.role}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
