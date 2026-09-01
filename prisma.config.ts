import "dotenv/config";
import { defineConfig } from "prisma/config";

// La connessione serve solo a migrate e introspect. `generate` gira anche in
// fase di build (Docker, Vercel), dove il database puo' non esserci: senza URL
// la configurazione la omette invece di fallire.
//
// DIRECT_URL ha la precedenza: i Postgres gestiti danno una stringa "pooled"
// per l'app e una diretta per le migrazioni, che dal pooler possono fallire.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
