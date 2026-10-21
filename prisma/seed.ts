/**
 * Starting data for a fresh database. Safe to run again: it only adds what is missing.
 *
 *   npm run db:seed
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { chunkSections } from "../src/lib/knowledge/chunker";
import { toSections } from "../src/lib/knowledge/loaders";

const prisma = new PrismaClient();

async function main() {
  // 1. First admin (from .env). Existing accounts are left alone.
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (email && password.length >= 12) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (!exists) {
      await prisma.user.create({ data: { email, name: process.env.SEED_ADMIN_NAME || "Admin", role: "SUPER_ADMIN", passwordHash: await bcrypt.hash(password, 12) } });
      console.log(`✓ admin user created: ${email}`);
    } else console.log(`• admin user exists: ${email}`);
  } else console.warn("! SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (12+ chars) not set, no admin created");

  // 2. Settings row.
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log("✓ settings");

  // 3. Sample FAQ so the knowledge search works from day one (archive it once you upload your own).
  const title = "Sample FAQ (replace me)";
  if (!(await prisma.knowledgeDocument.findFirst({ where: { title } }))) {
    const text = readFileSync(join(__dirname, "seed-data", "sample-faq.md"), "utf8");
    const chunks = chunkSections(toSections("md", text, title));
    await prisma.knowledgeDocument.create({
      data: { title, category: "faq", fileName: "sample-faq.md", chunks: { create: chunks.map((c, i) => ({ position: i, heading: c.heading?.slice(0, 300) ?? null, text: c.text })) } },
    });
    console.log(`✓ sample FAQ (${chunks.length} passages)`);
  } else console.log("• sample FAQ exists");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
