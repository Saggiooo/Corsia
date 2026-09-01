/**
 * Verifica che i dati di un utente non siano visibili a un altro, usando gli
 * stessi filtri delle query dell'app.
 *
 *   npx tsx scripts/check-isolation.mts <email-a> <email-b>
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const [emailA, emailB] = process.argv.slice(2);
if (!emailA || !emailB) throw new Error("uso: check-isolation.mts <email-a> <email-b>");

const [a, b] = await Promise.all([
  prisma.user.findUniqueOrThrow({ where: { email: emailA } }),
  prisma.user.findUniqueOrThrow({ where: { email: emailB } }),
]);

const list = await prisma.list.findFirst({ where: { userId: a.id } });
if (!list) throw new Error(`${emailA} non ha liste da controllare`);

// Stesso filtro di getList(id, userId).
const own = await prisma.list.findFirst({ where: { id: list.id, userId: a.id } });
const other = await prisma.list.findFirst({ where: { id: list.id, userId: b.id } });

console.log(`lista "${list.name}"`);
console.log(`  vista dal proprietario (${emailA}): ${own ? "sì" : "no"}`);
console.log(`  vista dall'altro utente (${emailB}): ${other ? "sì — PERDITA DI DATI" : "no"}`);

const counts = async (userId: string) => ({
  salvati: await prisma.savedProduct.count({ where: { userId } }),
  preferiti: await prisma.favoriteStore.count({ where: { userId } }),
  frequenze: await prisma.purchaseCount.count({ where: { userId } }),
});

console.log(emailA, await counts(a.id));
console.log(emailB, await counts(b.id));

if (other) process.exitCode = 1;

await prisma.$disconnect();
