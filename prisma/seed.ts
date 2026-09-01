import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildLayout } from "../src/lib/store/layout";
import { CATEGORIES, PRODUCTS, searchTextOf, slugify, type ProductSeed } from "../src/lib/store/catalog";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const STORE_SLUG = "extracoop-villanova";
const SNAPSHOT = resolve(process.cwd(), "data/catalog.snapshot.json");

type SnapshotRow = {
  name: string;
  brand: string | null;
  size: string | null;
  ean: string | null;
  categorySlug: string;
  iconKey: string | null;
  sourceId: string;
  sourceUrl: string | null;
};

/**
 * Catalogo da caricare: lo snapshot scaricato da coopshop.it se c'e', altrimenti
 * la lista curata a mano. L'app non dipende mai dalla rete.
 */
function loadCatalog(): { products: ProductSeed[]; source: string } {
  if (!existsSync(SNAPSHOT)) {
    return { products: PRODUCTS, source: "lista curata" };
  }

  const known = new Set(CATEGORIES.map((c) => c.slug));
  const snapshot = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as { products: SnapshotRow[] };

  const products = snapshot.products
    .filter((row) => known.has(row.categorySlug))
    .map<ProductSeed>((row) => ({
      name: row.name,
      categorySlug: row.categorySlug,
      iconKey: row.iconKey ?? undefined,
      size: row.size ?? undefined,
      brand: row.brand ?? undefined,
      ean: row.ean ?? undefined,
      sourceUrl: row.sourceUrl ?? undefined,
    }));

  return { products, source: `snapshot (${products.length} righe)` };
}

/** Nomi e formati si ripetono nel catalogo: lo slug va reso univoco. */
function uniqueSlug(base: string, seen: Set<string>): string {
  let slug = base || "prodotto";
  let n = 2;
  while (seen.has(slug)) slug = `${base}-${n++}`;
  seen.add(slug);
  return slug;
}

/** Hash stabile: lo stesso prodotto finisce sempre sulla stessa campata. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

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
  // I prodotti di una categoria si spalmano sulle campate della sua corsia:
  // e' cosi' che stanno davvero a scaffale, e rende il percorso realistico.
  const baysOf = new Map<string, number[]>();
  for (const location of layout.locations) {
    const key = `${location.aisleNumber}/${location.side}`;
    baysOf.set(key, [...(baysOf.get(key) ?? []), location.bay].sort((a, b) => a - b));
  }

  const catalog = loadCatalog();

  let created = 0;
  let moved = 0;
  const seenSlugs = new Set<string>();

  for (const product of catalog.products) {
    const slug = uniqueSlug(slugify(`${product.name} ${product.size ?? ""}`), seenSlugs);
    const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
    const bays = baysOf.get(`${category.home[0]}/${category.home[1]}`) ?? [category.home[2]];
    const bay = bays[hash(slug) % bays.length];
    const home = locationId.get(`${category.home[0]}/${category.home[1]}/${bay}`)!;

    const row = await prisma.product.upsert({
      where: { slug },
      create: {
        slug,
        name: product.name,
        brand: product.brand,
        size: product.size,
        ean: product.ean,
        sourceUrl: product.sourceUrl,
        categoryId: categoryId.get(product.categorySlug)!,
        iconKey: product.iconKey,
        searchText: searchTextOf(product),
      },
      update: {
        name: product.name,
        brand: product.brand,
        size: product.size,
        sourceUrl: product.sourceUrl,
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
    } else if (existing.confidence === "guessed" && existing.locationId !== home) {
      await prisma.placement.update({ where: { id: existing.id }, data: { locationId: home } });
      moved++;
    }
  }

  await prisma.settings.upsert({ where: { id: "singleton" }, create: {}, update: {} });

  console.log(
    `Seed ok: ${layout.aisles.length} corsie, ${layout.locations.length} punti di prelievo, ` +
      `${CATEGORIES.length} categorie, ${catalog.products.length} prodotti da ${catalog.source} ` +
      `(${created} nuove posizioni, ${moved} ipotesi aggiornate).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
