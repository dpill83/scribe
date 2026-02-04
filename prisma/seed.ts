import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultContent = JSON.stringify({ type: "doc", content: [] });

async function main() {
  const welcome = await prisma.page.upsert({
    where: { id: "seed-welcome" },
    update: {},
    create: {
      id: "seed-welcome",
      title: "Welcome",
      contentJson: defaultContent,
      sortOrder: 0,
    },
  });

  const gettingStarted = await prisma.page.upsert({
    where: { id: "seed-getting-started" },
    update: {},
    create: {
      id: "seed-getting-started",
      title: "Getting started",
      contentJson: defaultContent,
      sortOrder: 1,
    },
  });

  await prisma.page.upsert({
    where: { id: "seed-nested" },
    update: {},
    create: {
      id: "seed-nested",
      parentId: welcome.id,
      title: "Your first page",
      contentJson: defaultContent,
      sortOrder: 0,
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
