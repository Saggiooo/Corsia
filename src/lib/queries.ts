import { prisma } from "@/lib/db";
import type { MapFixture, MapLabel } from "@/components/map/StoreMap";
import { normalizeSearchText, productNameForAlias } from "@/lib/store/catalog";

export const STORE_SLUG = "extracoop-villanova";

export async function getStore() {
  return prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
}

export type MapData = {
  grid: string[];
  fixtures: MapFixture[];
  entrance: [number, number];
  checkout: [number, number];
  labels: MapLabel[];
  cellSizeCm: number;
};

/** Tutto quello che serve a disegnare la mappa, gia' pronto per il componente. */
export async function getMapData(): Promise<MapData> {
  const store = await getStore();

  const [fixtures, aisles] = await Promise.all([
    prisma.fixture.findMany({ where: { storeId: store.id } }),
    prisma.aisle.findMany({
      where: { storeId: store.id },
      include: { locations: true },
      orderBy: { sequence: "asc" },
    }),
  ]);

  const labels: MapLabel[] = [];

  for (const fixture of fixtures) {
    if (!fixture.label) continue;
    const cells = fixture.cells as number[][];
    const xs = cells.map((c) => c[0]);
    const ys = cells.map((c) => c[1]);
    labels.push({
      x: (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5,
      y: (Math.min(...ys) + Math.max(...ys)) / 2 + 0.5,
      text: fixture.label,
    });
  }

  for (const aisle of aisles) {
    if (!aisle.vertical || aisle.locations.length === 0) continue;
    const xs = aisle.locations.map((l) => l.accessX);
    const top = Math.min(...aisle.locations.map((l) => l.accessY));
    labels.push({
      x: (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5,
      y: top - 1.6,
      text: String(aisle.number),
      muted: true,
    });
  }

  return {
    grid: store.grid as string[],
    cellSizeCm: store.cellSizeCm,
    entrance: [store.entranceX, store.entranceY],
    checkout: [store.checkoutX, store.checkoutY],
    labels,
    fixtures: fixtures.map((f) => ({
      kind: f.kind,
      label: f.label,
      colorToken: f.colorToken,
      cells: f.cells as number[][],
    })),
  };
}

export type SearchHit = {
  id: string;
  name: string;
  brand: string | null;
  size: string | null;
  iconKey: string | null;
  categoryName: string;
  categoryIcon: string;
  colorToken: string;
  aisleName: string | null;
  locationLabel: string | null;
  confirmed: boolean;
};

/**
 * Ricerca fuzzy sul catalogo, con la posizione nota del prodotto.
 * Sia ILIKE '%…%' sia l'operatore % di pg_trgm passano dall'indice GIN;
 * `similarity()` resta solo nell'ordinamento, dove l'indice non serve.
 */
export async function searchProducts(query: string, limit = 24): Promise<SearchHit[]> {
  const term = normalizeSearchText(query);
  if (term.length < 2) return [];
  const preferredName = productNameForAlias(query) ?? "";

  return prisma.$queryRaw<SearchHit[]>`
    SELECT p.id,
           p.name,
           p.brand,
           p.size,
           p."iconKey",
           c.name        AS "categoryName",
           c."iconKey"   AS "categoryIcon",
           c."colorToken" AS "colorToken",
           a.name        AS "aisleName",
           l.label       AS "locationLabel",
           (pl.confidence = 'confirmed') AS "confirmed"
    FROM "Product" p
    JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Placement" pl ON pl."productId" = p.id
    LEFT JOIN "Location" l ON l.id = pl."locationId"
    LEFT JOIN "Aisle" a ON a.id = l."aisleId"
    WHERE p."searchText" ILIKE '%' || ${term} || '%'
       OR p."searchText" % ${term}
    ORDER BY (p.name = ${preferredName}) DESC,
             (p."searchText" ILIKE ${term} || '%') DESC,
             similarity(p."searchText", ${term}) DESC,
             p."timesBought" DESC,
             p.name ASC
    LIMIT ${limit}
  `;
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getLists() {
  return prisma.list.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { _count: { select: { items: true } }, items: { select: { checked: true } } },
  });
}

export async function getList(id: string) {
  return prisma.list.findUnique({
    where: { id },
    include: {
      route: true,
      items: {
        orderBy: { sortIndex: "asc" },
        include: {
          product: {
            include: {
              category: true,
              placements: { include: { location: { include: { aisle: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function getMostBought(limit = 12) {
  return prisma.product.findMany({
    where: { timesBought: { gt: 0 } },
    orderBy: [{ timesBought: "desc" }, { name: "asc" }],
    take: limit,
    include: { category: true },
  });
}
