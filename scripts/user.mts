/**
 * Gestione utenti da riga di comando. Non esiste registrazione pubblica:
 * gli account li crei tu.
 *
 *   npx tsx scripts/user.mts elenco
 *   npx tsx scripts/user.mts aggiungi mario@esempio.it Mario Rossi [password]
 *   npx tsx scripts/user.mts ruolo mario@esempio.it admin
 *   npx tsx scripts/user.mts password mario@esempio.it nuovaPassword
 *   npx tsx scripts/user.mts rimuovi mario@esempio.it
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/crypto";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const [command, ...args] = process.argv.slice(2);

function generatedPassword(): string {
  return randomBytes(9).toString("base64url");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function main() {
  switch (command) {
    case "elenco": {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { lists: true, saved: true } } },
      });

      if (users.length === 0) {
        console.log("Nessun utente. Creane uno con: npx tsx scripts/user.mts aggiungi <email> <nome> <cognome>");
        return;
      }

      for (const user of users) {
        console.log(
          `${user.email.padEnd(30)} ${`${user.firstName} ${user.lastName}`.padEnd(24)} ` +
            `${user.role.padEnd(7)} ${user._count.lists} liste, ${user._count.saved} salvati`,
        );
      }
      return;
    }

    case "aggiungi": {
      const [email, firstName, lastName, password] = args;
      const role = args[4] as "admin" | "member" | undefined;
      if (!email || !firstName || !lastName) {
        throw new Error("uso: aggiungi <email> <nome> <cognome> [password] [admin|member]");
      }
      if (role && role !== "admin" && role !== "member") {
        throw new Error("il ruolo puo' essere solo admin o member");
      }

      const chosen = password ?? generatedPassword();
      const user = await prisma.user.create({
        data: {
          email: normalizeEmail(email),
          firstName,
          lastName,
          passwordHash: hashPassword(chosen),
          role: role ?? "member",
        },
      });

      console.log(`Creato ${user.email} (${user.role})`);
      if (!password) console.log(`Password generata: ${chosen}`);
      return;
    }

    case "ruolo": {
      const [email, role] = args;
      if (role !== "admin" && role !== "member") {
        throw new Error("uso: ruolo <email> <admin|member>");
      }

      const user = await prisma.user.update({
        where: { email: normalizeEmail(email) },
        data: { role },
      });

      console.log(`${user.email} ora e' ${user.role}`);
      return;
    }

    case "password": {
      const [email, password] = args;
      if (!email || !password) throw new Error("uso: password <email> <nuovaPassword>");

      await prisma.user.update({
        where: { email: normalizeEmail(email) },
        data: { passwordHash: hashPassword(password) },
      });

      // Cambiare password chiude le sessioni aperte altrove.
      const { count } = await prisma.session.deleteMany({
        where: { user: { email: normalizeEmail(email) } },
      });

      console.log(`Password aggiornata. Sessioni chiuse: ${count}`);
      return;
    }

    case "rimuovi": {
      const [email] = args;
      if (!email) throw new Error("uso: rimuovi <email>");

      const user = await prisma.user.delete({ where: { email: normalizeEmail(email) } });
      console.log(`Rimosso ${user.email} con tutte le sue liste.`);
      return;
    }

    default:
      console.log("Comandi: elenco | aggiungi | ruolo | password | rimuovi");
      process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
