import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create sample content
  const newsContent = await prisma.content.upsert({
    where: { id: "sample-news-1" },
    update: {},
    create: {
      id: "sample-news-1",
      type: "news",
      titleBg: "Добре дошли в Digital4D",
      titleEn: "Welcome to Digital4D",
      titleEs: "Bienvenido a Digital4D",
      bodyBg: "Вашият надежден партньор за 3D печат и моделиране.",
      bodyEn: "Your trusted partner for 3D printing and modeling.",
      bodyEs: "Tu socio de confianza para impresión y modelado 3D.",
      published: true,
      order: 1,
    },
  });

  console.log("Created sample content:", newsContent.id);

  // Note: Admin users are created automatically when they sign in with OAuth.
  // To make a user an admin, use Prisma Studio:
  // npx prisma studio
  // Then find the user and change their role to "ADMIN"

  console.log("\nSeeding complete!");
  console.log("\nTo create an admin user:");
  console.log("1. Sign in with OAuth (Google, Apple, or Facebook)");
  console.log("2. Run: npx prisma studio");
  console.log("3. Find your user in the User table");
  console.log('4. Change the role from "USER" to "ADMIN"');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
