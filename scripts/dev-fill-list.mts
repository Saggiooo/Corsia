import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const listId = process.argv[2];
const names = process.argv.slice(3);
if (!listId || names.length === 0) throw new Error("uso: dev-fill-list.mts <listId> <nome> ...");

let index = await prisma.listItem.count({ where: { listId } });

for (const name of names) {
  const product = await prisma.product.findFirst({ where: { name } });
  if (!product) {
    console.log("non trovato:", name);
    continue;
  }
  const existing = await prisma.listItem.findFirst({ where: { listId, productId: product.id } });
  if (existing) continue;
  await prisma.listItem.create({ data: { listId, productId: product.id, rawText: name, sortIndex: index++ } });
}

console.log("articoli in lista:", await prisma.listItem.count({ where: { listId } }));
await prisma.$disconnect();
