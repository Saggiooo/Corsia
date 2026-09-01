import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildLayout } from "../src/lib/store/layout";
import { CATEGORIES, PRODUCTS, searchTextOf, slugify } from "../src/lib/store/catalog";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STORE_SLUG = "extracoop-villanova";

async function main() {
  const layout = buildLayout();

  const store = await prisma.store.upsert({
    where: { slug: STORE_SLUG },
    create: {
      slug: STORE_SLUG,
      name: "Extracoop Villanova",
      address: "Via Villanova, Castenaso (BO)",
      gridW: layout.width,
      gridH: layout.height,
      cellSizeCm: layout.cellSizeCm,
      grid: layout.grid,
      entranceX: layout.entrance[0],
      entranceY: layout.entrance[1],
      checkoutX: layout.checkout[0],
      checkoutY: layout.checkout[1],
    },
    update: {},
  });

  // --- Corsie -----------------------------------------------------------
  const aisleId = new Map<number, string>();
  for (const aisle of layout.aisles) {
    const row = await prisma.aisle.upsert({
      where: { storeId_number: { storeId: store.id, number: aisle.number } },
      create: { storeId: store.id, ...aisle },
      update: { name: aisle.name, sequence: aisle.sequence, vertical: aisle.vertical },
    });
    aisleId.set(aisle.number, row.id);
  }

  // --- Blocchi disegnati sulla mappa -------------------------------------
  // Ricreati da zero: le posizioni prodotto non dipendono da loro.
  await prisma.fixture.deleteMany({ where: { storeId: store.id } });
  const fixtureId = new Map<string, string>();
  for (const fixture of layout.fixtures) {
    const row = await prisma.fixture.create({
      data: {
        storeId: store.id,
        kind: fixture.kind,
        label: fixture.label,
        colorToken: fixture.colorToken,
        cells: fixture.cells,
      },
    });
    fixtureId.set(fixture.key, row.id);
  }

  // --- Punti di prelievo --------------------------------------------------
  const locationId = new Map<string, string>();
  for (const location of layout.locations) {
    const aisle = aisleId.get(location.aisleNumber)!;
    const row = await prisma.location.upsert({
      where: {
        storeId_aisleId_side_bay: {
          storeId: store.id,
          aisleId: aisle,
          side: location.side,
          bay: location.bay,
        },
      },
      create: {
        storeId: store.id,
        aisleId: aisle,
        fixtureId: location.fixtureKey ? fixtureId.get(location.fixtureKey) : undefined,
        side: location.side,
        bay: location.bay,
        accessX: location.accessX,
        accessY: location.accessY,
        label: location.label,
      },
      update: {
        fixtureId: location.fixtureKey ? fixtureId.get(location.fixtureKey) : undefined,
        accessX: location.accessX,
        accessY: location.accessY,
        label: location.label,
      },
    });
    locationId.set(`${location.aisleNumber}/${location.side}/${location.bay}`, row.id);
  }

  // --- Categorie ----------------------------------------------------------
  const categoryId = new Map<string, string>();
  for (const [index, category] of CATEGORIES.entries()) {
    const home = locationId.get(`${category.home[0]}/${category.home[1]}/${category.home[2]}`);
    if (!home) throw new Error(`Categoria ${category.slug}: posizione ${category.home.join("/")} inesistente`);

    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        slug: category.slug,
        name: category.name,
        iconKey: category.iconKey,
        colorToken: category.colorToken,
        pickClass: category.pickClass,
        sortOrder: index,
        defaultLocationId: home,
      },
      update: {
        name: category.name,
        iconKey: category.iconKey,
        colorToken: category.colorToken,
        pickClass: category.pickClass,
        sortOrder: index,
        defaultLocationId: home,
      },
    });
    categoryId.set(category.slug, row.id);
  }

  // --- Prodotti e posizioni ipotizzate ------------------------------------
  let created = 0;
  for (const product of PRODUCTS) {
    const slug = slugify(`${product.name} ${product.size ?? ""}`);
    const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
    const home = locationId.get(`${category.home[0]}/${category.home[1]}/${category.home[2]}`)!;

    const row = await prisma.product.upsert({
      where: { slug },
      create: {
        slug,
        name: product.name,
        brand: product.brand,
        size: product.size,
        categoryId: categoryId.get(product.categorySlug)!,
        iconKey: product.iconKey,
        searchText: searchTextOf(product),
      },
      update: {
        name: product.name,
        categoryId: categoryId.get(product.categorySlug)!,
        iconKey: product.iconKey,
        searchText: searchTextOf(product),
      },
    });

    // Le posizioni confermate a mano non vengono mai sovrascritte.
    const existing = await prisma.placement.findUnique({
      where: { productId_storeId: { productId: row.id, storeId: store.id } },
    });
    if (!existing) {
      await prisma.placement.create({
        data: { productId: row.id, storeId: store.id, locationId: home, confidence: "guessed" },
      });
      created++;
    }
  }

  await prisma.settings.upsert({ where: { id: "singleton" }, create: {}, update: {} });

  console.log(
    `Seed ok: ${layout.aisles.length} corsie, ${layout.locations.length} punti di prelievo, ` +
      `${CATEGORIES.length} categorie, ${PRODUCTS.length} prodotti (${created} nuove posizioni).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
