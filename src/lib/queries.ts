import { prisma } from "@/lib/db";
import type { MapFixture, MapLabel } from "@/components/map/StoreMap";
import { normalizeSearchText, productNamesForSearch } from "@/lib/store/catalog";

export const STORE_SLUG = "extracoop-villanova";

export async function getStore() {
  return prisma.store.findUniqueOrThrow({ where: { slug: STORE_SLUG } });
}

/** Tutti i supermercati, con la stella dell'utente e i preferiti in cima. */
export async function getStores(userId: string) {
  const stores = await prisma.store.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { favorites: { where: { userId } } },
  });

  return stores
    .map((store) => ({ ...store, favorite: store.favorites.length > 0 }))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
}

/** Il supermercato su cui si apre una nuova lista se non se ne sceglie uno. */
export async function getDefaultStore(userId: string) {
  const stores = await getStores(userId);
  return stores.find((store) => store.status === "active") ?? null;
}

export type MapData = {
  grid: string[];
  fixtures: MapFixture[];
  entrance: [number, number];
  checkout: [number, number];
  labels: MapLabel[];
  cellSizeCm: number;
};

/**
 * Tutto quello che serve a disegnare la mappa, gia' pronto per il componente.
 * Senza `storeId` usa il negozio predefinito.
 */
export async function getMapData(storeId?: string): Promise<MapData> {
  const store = storeId
    ? await prisma.store.findUniqueOrThrow({ where: { id: storeId } })
    : await getStore();

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
  const preferredNames = productNamesForSearch(query);
  const queryLimit = limit + preferredNames.length;

  const hits = await prisma.$queryRaw<SearchHit[]>`
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
    ORDER BY (p."searchText" ILIKE ${term} || '%') DESC,
             similarity(p."searchText", ${term}) DESC,
             p."timesBought" DESC,
             p.name ASC
    LIMIT ${queryLimit}
  `;

  if (preferredNames.length === 0) return hits.slice(0, limit);

  const preferredOrder = new Map(preferredNames.map((name, index) => [name, index]));
  return hits
    .map((hit, index) => ({ hit, index, preferred: preferredOrder.get(hit.name) }))
    .sort((a, b) => (a.preferred ?? Number.MAX_SAFE_INTEGER) - (b.preferred ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .slice(0, limit)
    .map(({ hit }) => hit);
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getLists(userId: string) {
  return prisma.list.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { _count: { select: { items: true } }, items: { select: { checked: true } } },
  });
}

/** Filtra per proprietario: un id indovinato non basta ad aprire la lista altrui. */
export async function getList(id: string, userId: string) {
  return prisma.list.findFirst({
    where: { id, userId },
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

/** I prodotti che questo utente compra piu' spesso. */
export async function getMostBought(userId: string, limit = 12) {
  const counts = await prisma.purchaseCount.findMany({
    where: { userId, count: { gt: 0 } },
    orderBy: [{ count: "desc" }],
    take: limit,
    include: { product: { include: { category: true } } },
  });

  return counts.map((row) => row.product);
}

/** Prodotti messi da parte, con la nota gia' scritta. */
export async function getSavedProducts(userId: string) {
  return prisma.savedProduct.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { product: { include: { category: true } } },
  });
}

export async function isFavoriteStore(userId: string, storeId: string): Promise<boolean> {
  const favorite = await prisma.favoriteStore.findUnique({
    where: { userId_storeId: { userId, storeId } },
  });

  return favorite !== null;
}

// --- Admin ----------------------------------------------------------------

export async function getReports(status?: "pending" | "accepted" | "rejected") {
  return prisma.report.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      resolvedBy: { select: { firstName: true, lastName: true } },
      store: { select: { name: true } },
      product: { include: { category: true } },
      previous: { include: { aisle: true } },
      suggested: { include: { aisle: true } },
    },
  });
}

export async function countPendingReports(): Promise<number> {
  return prisma.report.count({ where: { status: "pending" } });
}

/** Punti di prelievo di un negozio, pronti da mostrare in un elenco a tendina. */
export async function getPickLocations(storeId: string) {
  const locations = await prisma.location.findMany({
    where: { storeId },
    orderBy: [{ aisle: { sequence: "asc" } }, { side: "asc" }, { bay: "asc" }],
    include: { aisle: true },
  });

  return locations.map((location) => ({
    id: location.id,
    label: location.label ?? `${location.aisle.name} · ${location.side}${location.bay}`,
    aisleName: location.aisle.name,
    accessX: location.accessX,
    accessY: location.accessY,
  }));
}

/** Prodotti di una categoria con la posizione attuale nel negozio indicato. */
export async function getCategoryPlacements(categorySlug: string, storeId: string) {
  const products = await prisma.product.findMany({
    where: { category: { slug: categorySlug } },
    orderBy: { name: "asc" },
    include: {
      category: true,
      placements: { where: { storeId }, include: { location: { include: { aisle: true } } } },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    size: product.size,
    iconKey: product.iconKey,
    categoryIcon: product.category.iconKey,
    colorToken: product.category.colorToken,
    locationId: product.placements[0]?.locationId ?? null,
    locationLabel: product.placements[0]?.location.label ?? null,
    confirmed: product.placements[0]?.confidence === "confirmed",
  }));
}

export async function getMappedStores() {
  return prisma.store.findMany({
    where: { status: "active" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/** Supermercati con due numeri utili a capire a che punto e' la mappatura. */
export async function getStoresForAdmin() {
  const stores = await prisma.store.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { aisles: true, placements: true } } },
  });

  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    address: store.address,
    status: store.status,
    aisles: store._count.aisles,
    products: store._count.placements,
  }));
}
