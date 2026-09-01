/** Verifica che le tratte siano allineate alle tappe su un percorso reale. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { splitLegs } from "../src/lib/map/trace";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const listId = process.argv[2];
const route = await prisma.route.findFirstOrThrow({ where: { listId } });
const snapshot = route.stops as unknown as { stops: { name: string; x: number; y: number }[] };
const path = (route.path as number[][]).map(([x, y]) => ({ x, y }));

const legs = splitLegs(
  path,
  snapshot.stops.map((s) => ({ x: s.x, y: s.y })),
);

let misaligned = 0;
snapshot.stops.forEach((stop, i) => {
  const leg = legs[i] ?? [];
  const end = leg.at(-1);
  const ok = end?.x === stop.x && end?.y === stop.y;
  if (!ok) misaligned++;

  if (i >= 14 && i <= 25) {
    console.log(
      String(i + 1).padStart(2),
      stop.name.slice(0, 22).padEnd(24),
      `${stop.x},${stop.y}`.padEnd(7),
      `celle ${String(leg.length).padStart(3)}`,
      ok ? "" : "  DISALLINEATA",
    );
  }
});

console.log(`\ntappe ${snapshot.stops.length}, tratte ${legs.length}, disallineate ${misaligned}`);
await prisma.$disconnect();
