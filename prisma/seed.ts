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
 * Catalogo da caricare. Di default la lista curata a mano: prodotti generici
 * ("Spaghetti", non "Spaghetti Barilla n.5 500g"), perche' la posizione a
 * scaffale e' la stessa per tutte le paste e il dettaglio lo aggiunge la nota
 * sulla riga della lista. Con `--from-snapshot` si carica invece il catalogo
 * completo scaricato da coopshop.it. L'app non dipende mai dalla rete.
 */
function loadCatalog(): { products: ProductSeed[]; source: string } {
  if (!process.argv.includes("--from-snapshot")) {
    return { products: PRODUCTS, source: "lista curata" };
  }

  if (!existsSync(SNAPSHOT)) {
    throw new Error(`--from-snapshot richiesto ma ${SNAPSHOT} non esiste. Lancia scripts/scrape-coop.ts.`);
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

function chunked<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
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
      status: "active",
      sortOrder: 0,
    },
    update: {},
  });

  // Annunciato ma senza planimetria: si vede sulla home, non e' selezionabile.
  await prisma.store.upsert({
    where: { slug: "conad-castenaso" },
    create: {
      slug: "conad-castenaso",
      name: "Conad Castenaso",
      address: "Castenaso (BO)",
      status: "comingSoon",
      sortOrder: 1,
      // Tela vuota delle stesse dimensioni dell'altro negozio: l'admin ci
      // disegna sopra dall'editor, poi lo rende utilizzabile.
      gridW: layout.width,
      gridH: layout.height,
      cellSizeCm: layout.cellSizeCm,
      grid: Array.from({ length: layout.height }, (_, y) =>
        Array.from({ length: layout.width }, (_, x) =>
          x === 0 || y === 0 || x === layout.width - 1 || y === layout.height - 1 ? "#" : ".",
        ).join(""),
      ),
      entranceX: 2,
      entranceY: 2,
      checkoutX: layout.width - 3,
      checkoutY: layout.height - 3,
    },
    update: { status: "comingSoon", sortOrder: 1 },
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
  const seenSlugs = new Set<string>();

  type Row = {
    slug: string;
    name: string;
    brand: string | null;
    size: string | null;
    ean: string | null;
    sourceUrl: string | null;
    categoryId: string;
    iconKey: string | null;
    searchText: string;
    home: string;
  };

  const rows: Row[] = [];
  const seenEans = new Set<string>();

  for (const product of catalog.products) {
    const category = CATEGORIES.find((c) => c.slug === product.categorySlug)!;
    const slug = uniqueSlug(slugify(`${product.name} ${product.size ?? ""}`), seenSlugs);
    const bays = baysOf.get(`${category.home[0]}/${category.home[1]}`) ?? [category.home[2]];
    const bay = bays[hash(slug) % bays.length];

    // L'EAN e' unico a schema: nel catalogo capita ripetuto fra varianti.
    const ean = product.ean && !seenEans.has(product.ean) ? product.ean : null;
    if (ean) seenEans.add(ean);

    rows.push({
      slug,
      name: product.name,
      brand: product.brand ?? null,
      size: product.size ?? null,
      ean,
      sourceUrl: product.sourceUrl ?? null,
      categoryId: categoryId.get(product.categorySlug)!,
      iconKey: product.iconKey ?? null,
      searchText: searchTextOf(product),
      home: locationId.get(`${category.home[0]}/${category.home[1]}/${bay}`)!,
    });
  }

  // Un solo giro di lettura, poi scritture a lotti: con decine di migliaia di
  // prodotti gli upsert uno a uno renderebbero il seed inutilizzabile.
  const existing = new Map(
    (
      await prisma.product.findMany({
        select: { id: true, slug: true, name: true, categoryId: true, iconKey: true, searchText: true },
      })
    ).map(
      (p) => [p.slug, p],
    ),
  );

  const toCreate = rows.filter((row) => !existing.has(row.slug));
  const toUpdate = rows.filter((row) => {
    const current = existing.get(row.slug);
    return (
      current !== undefined &&
      (current.name !== row.name ||
        current.categoryId !== row.categoryId ||
        current.iconKey !== row.iconKey ||
        current.searchText !== row.searchText)
    );
  });

  for (const chunk of chunked(toCreate, 1000)) {
    await prisma.product.createMany({ data: chunk.map(({ home: _home, ...data }) => data) });
  }

  for (const row of toUpdate) {
    await prisma.product.update({
      where: { slug: row.slug },
      data: {
        name: row.name,
        brand: row.brand,
        size: row.size,
        sourceUrl: row.sourceUrl,
        categoryId: row.categoryId,
        iconKey: row.iconKey,
        searchText: row.searchText,
      },
    });
  }

  const idBySlug = new Map(
    (await prisma.product.findMany({ select: { id: true, slug: true } })).map((p) => [p.slug, p.id]),
  );

  const placements = new Map(
    (
      await prisma.placement.findMany({
        where: { storeId: store.id },
        select: { id: true, productId: true, locationId: true, confidence: true },
      })
    ).map((p) => [p.productId, p]),
  );

  const newPlacements = [];
  const moves = new Map<string, string[]>();

  for (const row of rows) {
    const productId = idBySlug.get(row.slug)!;
    const current = placements.get(productId);

    if (!current) {
      newPlacements.push({ productId, storeId: store.id, locationId: row.home, confidence: "guessed" as const });
      continue;
    }

    // Le posizioni confermate a mano non vengono mai sovrascritte.
    if (current.confidence === "guessed" && current.locationId !== row.home) {
      moves.set(row.home, [...(moves.get(row.home) ?? []), current.id]);
    }
  }

  for (const chunk of chunked(newPlacements, 1000)) {
    await prisma.placement.createMany({ data: chunk });
  }

  let moved = 0;
  for (const [locationId, ids] of moves) {
    for (const chunk of chunked(ids, 1000)) {
      await prisma.placement.updateMany({ where: { id: { in: chunk } }, data: { locationId } });
      moved += chunk.length;
    }
  }

  const created = toCreate.length;

  // Il catalogo caricato e' la fonte di verita': i prodotti che non ci sono piu'
  // vengono rimossi, tranne quelli gia' usati in una lista o con una posizione
  // confermata a mano, che sono lavoro dell'utente e non si buttano.
  const stale = await prisma.product.findMany({
    where: {
      slug: { notIn: rows.map((r) => r.slug) },
      listItems: { none: {} },
      placements: { none: { confidence: "confirmed" } },
    },
    select: { id: true },
  });

  for (const chunk of chunked(stale.map((p) => p.id), 1000)) {
    await prisma.product.deleteMany({ where: { id: { in: chunk } } });
  }

  await prisma.settings.upsert({ where: { id: "singleton" }, create: {}, update: {} });

  console.log(
    `Seed ok: ${layout.aisles.length} corsie, ${layout.locations.length} punti di prelievo, ` +
      `${CATEGORIES.length} categorie, ${catalog.products.length} prodotti da ${catalog.source} ` +
      `(${created} nuovi, ${toUpdate.length} aggiornati, ${moved} ipotesi spostate, ${stale.length} rimossi).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
