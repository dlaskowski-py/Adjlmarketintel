import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The three ADJL Capital partners. Passwords are placeholders — replace the
// CHANGE_ME_* values (or set them via env) before seeding production.
const partners = [
  {
    email: "daniel@adjlcapital.com",
    name: "Daniel Laskowski",
    password: process.env.SEED_PW_DANIEL || "CHANGE_ME_1",
  },
  {
    email: "andrew@adjlcapital.com",
    name: "Andrew Jongeneel",
    password: process.env.SEED_PW_ANDREW || "CHANGE_ME_2",
  },
  {
    email: "james@adjlcapital.com",
    name: "James Harvey",
    password: process.env.SEED_PW_JAMES || "CHANGE_ME_3",
  },
];

async function main() {
  for (const p of partners) {
    const password = await bcrypt.hash(p.password, 12);
    await prisma.user.upsert({
      where: { email: p.email },
      update: { name: p.name, password },
      create: { email: p.email, name: p.name, password },
    });
    console.log(`Seeded partner: ${p.name} <${p.email}>`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
