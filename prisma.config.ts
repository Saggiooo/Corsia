import "dotenv/config";
import { defineConfig } from "prisma/config";

// La connessione serve solo a migrate e introspect. `generate` gira anche in
// fase di build Docker, dove il database non esiste ancora: senza URL la
// configurazione lo omette invece di fallire.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(url ? { datasource: { url } } : {}),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
