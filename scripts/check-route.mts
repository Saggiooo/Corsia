import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { parseGrid } from "../src/lib/routing/grid";
import { buildRoute, type PickClass } from "../src/lib/routing/route";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const names = [
  "Carote", "Latte intero", "Spaghetti", "Gelato vaniglia", "Carta igienica", "Uova medie",
  "Pane casereccio", "Tonno all'olio d'oliva", "Caffè macinato", "Birra chiara",
  "Patatine classiche", "Passata di pomodoro",
];

const store = await prisma.store.findFirstOrThrow({ where: { slug: "extracoop-villanova" } });
const products = await prisma.product.findMany({
  where: { name: { in: names } },
  include: { category: true, placements: { include: { location: { include: { aisle: true } } } } },
});

const stops = products.map((p) => {
  const placement = p.placements[0];
  return {
    id: p.id,
    x: placement.location.accessX,
    y: placement.location.accessY,
    aisleSequence: placement.location.aisle.sequence,
    pickClass: p.category.pickClass as PickClass,
    name: p.name,
    aisle: placement.location.aisle.name,
  };
});

const grid = parseGrid(store.grid as string[]);

for (const mode of ["shortest", "coldchain"] as const) {
  const result = buildRoute({
    grid,
    start: { x: store.entranceX, y: store.entranceY },
    end: { x: store.checkoutX, y: store.checkoutY },
    stops,
    cellSizeCm: store.cellSizeCm,
    mode,
  });
  console.log(
    `\n== ${mode} == ${result.distanceM} m · ~${result.estMinutes} min · ${result.path.length} celle · irraggiungibili ${result.unreachable.length}`,
  );
  result.order.forEach((s, i) => console.log(`  ${i + 1}. ${(s as typeof stops[number]).name} [${(s as typeof stops[number]).aisle}]`));
}

await prisma.$disconnect();
