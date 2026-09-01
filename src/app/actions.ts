"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/queries";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import { bfsFrom, parseGrid, UNREACHABLE } from "@/lib/routing/grid";
import { groupCells } from "@/lib/map/shapes";
import { deriveLayout } from "@/lib/store/derive";
import { buildRoute, type PickClass, type RouteStop } from "@/lib/routing/route";
import type { OrphanSnapshot, StopSnapshot } from "@/lib/route-types";

/**
 * Le liste sono personali: ogni azione parte da qui, cosi' un utente non puo'
 * toccare le liste di un altro passando un id a mano.
 */
async function ownedList(listId: string): Promise<{ id: string; userId: string }> {
  const user = await requireUser();
  const list = await prisma.list.findFirst({
    where: { id: listId, userId: user.id },
    select: { id: true, userId: true },
  });

  if (!list) throw new Error("Lista non trovata");
  return list;
}

async function ownedItem(itemId: string): Promise<{ id: string; listId: string }> {
  const user = await requireUser();
  const item = await prisma.listItem.findFirst({
    where: { id: itemId, list: { userId: user.id } },
    select: { id: true, listId: true },
  });

  if (!item) throw new Error("Articolo non trovato");
  return item;
}

function defaultListName(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" })
    .format(now)
    .replace(/^\w/, (c) => c.toUpperCase());
}

export async function createList(storeId?: string) {
  const user = await requireUser();
  const store = storeId
    ? await prisma.store.findUniqueOrThrow({ where: { id: storeId } })
    : await getStore();

  if (store.status !== "active") throw new Error("Questo supermercato non e' ancora mappato");

  const list = await prisma.list.create({
    data: { storeId: store.id, userId: user.id, name: defaultListName() },
  });
  revalidatePath("/");
  redirect(`/liste/${list.id}`);
}

export async function renameList(listId: string, name: string) {
  await ownedList(listId);
  await prisma.list.update({ where: { id: listId }, data: { name: name.trim() || defaultListName() } });
  revalidatePath(`/liste/${listId}`);
}

export async function deleteList(listId: string) {
  await ownedList(listId);
  await prisma.list.delete({ where: { id: listId } });
  revalidatePath("/");
  redirect("/");
}

export async function addProduct(listId: string, productId: string) {
  await ownedList(listId);
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  const existing = await prisma.listItem.findFirst({ where: { listId, productId } });

  if (existing) {
    await prisma.listItem.update({ where: { id: existing.id }, data: { qty: existing.qty + 1 } });
  } else {
    const count = await prisma.listItem.count({ where: { listId } });
    await prisma.listItem.create({
      data: { listId, productId, rawText: product.name, sortIndex: count },
    });
  }

  await invalidateRoute(listId);
  revalidatePath(`/liste/${listId}`);
}

export async function addFreeText(listId: string, text: string) {
  await ownedList(listId);
  const rawText = text.trim();
  if (!rawText) return;

  const count = await prisma.listItem.count({ where: { listId } });
  await prisma.listItem.create({ data: { listId, rawText, sortIndex: count } });

  await invalidateRoute(listId);
  revalidatePath(`/liste/${listId}`);
}

export async function setQty(itemId: string, qty: number) {
  const item = await ownedItem(itemId);

  if (qty <= 0) {
    await prisma.listItem.delete({ where: { id: itemId } });
    await invalidateRoute(item.listId);
  } else {
    await prisma.listItem.update({ where: { id: itemId }, data: { qty } });
  }

  revalidatePath(`/liste/${item.listId}`);
}

export async function removeItem(itemId: string) {
  const item = await ownedItem(itemId);
  await prisma.listItem.delete({ where: { id: itemId } });
  await invalidateRoute(item.listId);
  revalidatePath(`/liste/${item.listId}`);
}

/**
 * Nota personale sulla riga: il catalogo tiene prodotti generici ("Spaghetti"),
 * qui ci scrivi quello che vuoi davvero ("Barilla mezzo kg"). Non cambia la
 * posizione a scaffale, quindi non invalida il percorso.
 */
export async function setNote(itemId: string, note: string): Promise<void> {
  const item = await ownedItem(itemId);
  await prisma.listItem.update({
    where: { id: itemId },
    data: { note: note.trim() || null },
  });
  revalidatePath(`/liste/${item.listId}`, "layout");
}

export async function toggleChecked(itemId: string, checked: boolean): Promise<void> {
  const item = await ownedItem(itemId);
  await prisma.listItem.update({
    where: { id: itemId },
    data: { checked, checkedAt: checked ? new Date() : null },
  });
  revalidatePath(`/liste/${item.listId}/spesa`);
}

/**
 * Sposta un prodotto su un nuovo punto di prelievo e lo marca come confermato:
 * e' il modo in cui la mappa impara mentre si fa la spesa.
 */
/** Sposta davvero il prodotto. Solo gli admin: i membri usano `createReport`. */
export async function movePlacement(productId: string, locationId: string, level?: number | null) {
  await requireAdmin();
  const store = await getStore();
  await prisma.placement.upsert({
    where: { productId_storeId: { productId, storeId: store.id } },
    create: { productId, storeId: store.id, locationId, level, confidence: "confirmed" },
    update: { locationId, level, confidence: "confirmed" },
  });
  revalidatePath("/", "layout");
}

async function invalidateRoute(listId: string) {
  await prisma.route.deleteMany({ where: { listId } });
  await prisma.list.updateMany({ where: { id: listId, status: "routed" }, data: { status: "draft" } });
}

export async function computeRoute(listId: string, mode?: "shortest" | "coldchain") {
  await ownedList(listId);
  const store = await getStore();
  const [settings, list] = await Promise.all([
    prisma.settings.upsert({ where: { id: "singleton" }, create: {}, update: {} }),
    prisma.list.findUniqueOrThrow({
      where: { id: listId },
      include: {
        items: {
          orderBy: { sortIndex: "asc" },
          include: {
            product: {
              include: {
                category: true,
                placements: {
                  where: { storeId: store.id },
                  include: { location: { include: { aisle: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const chosenMode = mode ?? settings.routeMode;

  const stops: RouteStop[] = [];
  const meta = new Map<string, StopSnapshot>();
  const orphans: OrphanSnapshot[] = [];

  for (const item of list.items) {
    const placement = item.product?.placements[0];

    if (!item.product || !placement) {
      orphans.push({
        itemId: item.id,
        name: item.product?.name ?? item.rawText,
        note: item.note,
        qty: item.qty,
        unit: item.unit,
        reason: "senza-posizione",
      });
      continue;
    }

    stops.push({
      id: item.id,
      x: placement.location.accessX,
      y: placement.location.accessY,
      aisleSequence: placement.location.aisle.sequence,
      pickClass: item.product.category.pickClass as PickClass,
    });

    meta.set(item.id, {
      itemId: item.id,
      productId: item.product.id,
      name: item.product.name,
      note: item.note,
      qty: item.qty,
      unit: item.unit,
      size: item.product.size,
      iconKey: item.product.iconKey,
      categoryIcon: item.product.category.iconKey,
      categoryName: item.product.category.name,
      colorToken: item.product.category.colorToken,
      aisleName: placement.location.aisle.name,
      aisleNumber: placement.location.aisle.number,
      locationLabel: placement.location.label ?? placement.location.aisle.name,
      confirmed: placement.confidence === "confirmed",
      x: placement.location.accessX,
      y: placement.location.accessY,
    });
  }

  const result = buildRoute({
    grid: parseGrid(store.grid as string[]),
    start: { x: store.entranceX, y: store.entranceY },
    end: { x: store.checkoutX, y: store.checkoutY },
    stops,
    cellSizeCm: store.cellSizeCm,
    mode: chosenMode,
    walkSpeedMs: settings.walkSpeedMs,
    secondsPerPick: settings.secondsPerPick,
  });

  for (const stop of result.unreachable) {
    const snapshot = meta.get(stop.id);
    orphans.push({
      itemId: stop.id,
      name: snapshot?.name ?? "Prodotto",
      note: snapshot?.note ?? null,
      qty: snapshot?.qty ?? 1,
      unit: snapshot?.unit ?? null,
      reason: "irraggiungibile",
    });
  }

  const ordered = result.order.map((stop) => meta.get(stop.id)!).filter(Boolean);

  await prisma.route.upsert({
    where: { listId },
    create: {
      listId,
      mode: chosenMode,
      stops: { stops: ordered, orphans },
      path: result.path.map((p) => [p.x, p.y]),
      distanceM: result.distanceM,
      estMinutes: result.estMinutes,
    },
    update: {
      mode: chosenMode,
      stops: { stops: ordered, orphans },
      path: result.path.map((p) => [p.x, p.y]),
      distanceM: result.distanceM,
      estMinutes: result.estMinutes,
      computedAt: new Date(),
    },
  });

  await prisma.list.update({ where: { id: listId }, data: { status: "routed" } });
  revalidatePath(`/liste/${listId}`, "layout");
}

export async function startShopping(listId: string) {
  await ownedList(listId);
  await prisma.list.update({
    where: { id: listId },
    data: { status: "shopping", startedAt: new Date() },
  });
  redirect(`/liste/${listId}/spesa`);
}

export async function finishShopping(listId: string) {
  const list = await ownedList(listId);
  const items = await prisma.listItem.findMany({
    where: { listId, checked: true, productId: { not: null } },
    select: { productId: true },
  });

  await prisma.$transaction([
    // Popolarita' globale, usata solo come spareggio nella ricerca.
    ...items.map((item) =>
      prisma.product.update({
        where: { id: item.productId! },
        data: { timesBought: { increment: 1 } },
      }),
    ),
    // Frequenza personale: e' quella che alimenta "comprati spesso".
    ...items.map((item) =>
      prisma.purchaseCount.upsert({
        where: { userId_productId: { userId: list.userId, productId: item.productId! } },
        create: { userId: list.userId, productId: item.productId!, count: 1 },
        update: { count: { increment: 1 } },
      }),
    ),
    prisma.list.update({
      where: { id: listId },
      data: { status: "done", completedAt: new Date() },
    }),
  ]);

  revalidatePath("/", "layout");
  redirect(`/liste/${listId}/fine`);
}

// --- Preferiti e prodotti salvati ----------------------------------------

/** La stella sul supermercato. */
export async function toggleFavoriteStore(storeId: string) {
  const user = await requireUser();
  const existing = await prisma.favoriteStore.findUnique({
    where: { userId_storeId: { userId: user.id, storeId } },
  });

  if (existing) {
    await prisma.favoriteStore.delete({ where: { userId_storeId: { userId: user.id, storeId } } });
  } else {
    await prisma.favoriteStore.create({ data: { userId: user.id, storeId } });
  }

  revalidatePath("/");
}

/**
 * Mette da parte un prodotto con la nota che gli hai scritto, cosi' la prossima
 * volta lo ripeschi gia' personalizzato invece di riscriverla.
 */
export async function saveProduct(productId: string, note: string) {
  const user = await requireUser();

  await prisma.savedProduct.upsert({
    where: { userId_productId_note: { userId: user.id, productId, note: note.trim() } },
    create: { userId: user.id, productId, note: note.trim() },
    update: {},
  });

  revalidatePath("/", "layout");
}

export async function removeSavedProduct(savedId: string) {
  const user = await requireUser();
  await prisma.savedProduct.deleteMany({ where: { id: savedId, userId: user.id } });
  revalidatePath("/", "layout");
}

/** Aggiunge alla lista un prodotto salvato, riportandosi dietro la sua nota. */
export async function addSavedProduct(listId: string, savedId: string) {
  const user = await requireUser();
  await ownedList(listId);

  const saved = await prisma.savedProduct.findFirst({
    where: { id: savedId, userId: user.id },
    include: { product: true },
  });
  if (!saved) throw new Error("Prodotto salvato non trovato");

  const existing = await prisma.listItem.findFirst({
    where: { listId, productId: saved.productId, note: saved.note || null },
  });

  if (existing) {
    await prisma.listItem.update({ where: { id: existing.id }, data: { qty: existing.qty + 1 } });
  } else {
    const count = await prisma.listItem.count({ where: { listId } });
    await prisma.listItem.create({
      data: {
        listId,
        productId: saved.productId,
        rawText: saved.product.name,
        note: saved.note || null,
        sortIndex: count,
      },
    });
  }

  await invalidateRoute(listId);
  revalidatePath(`/liste/${listId}`);
}

export async function setRouteMode(mode: "shortest" | "coldchain") {
  await requireUser();
  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { routeMode: mode },
    update: { routeMode: mode },
  });
  revalidatePath("/", "layout");
}

/** Calcola il percorso e apre subito la schermata dedicata. */
export async function routeAndOpen(listId: string) {
  await computeRoute(listId);
  redirect(`/liste/${listId}/percorso`);
}

export type CellPaint = { x: number; y: number; kind: string; color?: string | null; label?: string | null };

/**
 * Salva la planimetria disegnata nell'editor: ricalcola la griglia di
 * percorribilita' e ricostruisce i blocchi raggruppando le celle contigue
 * dello stesso tipo. Corsie e punti di prelievo restano invariati; se qualche
 * punto finisce sotto un blocco, la funzione lo segnala invece di nasconderlo.
 */
export async function saveMap(input: {
  storeId: string;
  cells: CellPaint[];
  entrance: [number, number];
  checkout: [number, number];
}): Promise<{ blocked: string[]; unreachable: string[] }> {
  await requireAdmin();
  const store = await prisma.store.findUniqueOrThrow({ where: { id: input.storeId } });

  const blockedKinds = new Set(["shelf", "counter", "fridge", "freezer", "checkout", "wall", "promo"]);
  const kindOf = new Map<string, string>();
  for (const cell of input.cells) kindOf.set(`${cell.x},${cell.y}`, cell.kind);

  const rows: string[] = [];
  for (let y = 0; y < store.gridH; y++) {
    let row = "";
    for (let x = 0; x < store.gridW; x++) {
      const kind = kindOf.get(`${x},${y}`);
      row += kind && blockedKinds.has(kind) ? "#" : ".";
    }
    rows.push(row);
  }

  const grid = parseGrid(rows);
  const locations = await prisma.location.findMany({
    where: { storeId: store.id },
    include: { aisle: true },
  });

  const blocked = locations
    .filter((l) => !grid.walkable(l.accessX, l.accessY))
    .map((l) => l.label ?? l.aisle.name);

  const reach = bfsFrom(grid, { x: input.entrance[0], y: input.entrance[1] });
  const unreachable = locations
    .filter((l) => grid.walkable(l.accessX, l.accessY))
    .filter((l) => reach[grid.index(l.accessX, l.accessY)] === UNREACHABLE)
    .map((l) => l.label ?? l.aisle.name);

  // Raggruppo per tipo, colore *e* nome: cosi' due reparti diversi disegnati
  // con lo stesso strumento restano blocchi distinti, con la loro etichetta.
  const byStyle = new Map<string, number[][]>();
  for (const cell of input.cells) {
    const style = `${cell.kind}::${cell.color ?? ""}::${cell.label ?? ""}`;
    byStyle.set(style, [...(byStyle.get(style) ?? []), [cell.x, cell.y]]);
  }

  await prisma.$transaction(async (tx) => {
    await tx.fixture.deleteMany({ where: { storeId: store.id } });

    for (const [style, cells] of byStyle) {
      const [kind, color, label] = style.split("::");
      for (const group of groupCells(cells)) {
        await tx.fixture.create({
          data: {
            storeId: store.id,
            kind: kind as never,
            colorToken: color || KIND_COLOR[kind] || null,
            label: label || null,
            cells: group,
          },
        });
      }
    }

    await tx.fixture.create({
      data: {
        storeId: store.id,
        kind: "entrance",
        cells: [[input.entrance[0], input.entrance[1]]],
      },
    });

    await tx.store.update({
      where: { id: store.id },
      data: {
        grid: rows,
        entranceX: input.entrance[0],
        entranceY: input.entrance[1],
        checkoutX: input.checkout[0],
        checkoutY: input.checkout[1],
      },
    });
  });

  revalidatePath("/", "layout");
  return { blocked, unreachable };
}

const KIND_COLOR: Record<string, string> = {
  fridge: "dairy",
  freezer: "frozen",
  counter: "meat",
  checkout: "checkout",
  promo: "sweet",
};

// --- Segnalazioni ---------------------------------------------------------

/**
 * Un membro segnala che un prodotto non e' dove dice l'app, e propone dove
 * sta davvero. Non cambia niente da solo: decide un admin.
 */
export async function createReport(input: {
  productId: string;
  storeId: string;
  suggestedLocationId: string | null;
  message: string;
}) {
  const user = await requireUser();

  const placement = await prisma.placement.findUnique({
    where: { productId_storeId: { productId: input.productId, storeId: input.storeId } },
    select: { locationId: true },
  });

  await prisma.report.create({
    data: {
      userId: user.id,
      storeId: input.storeId,
      productId: input.productId,
      previousLocationId: placement?.locationId ?? null,
      suggestedLocationId: input.suggestedLocationId,
      message: input.message.trim() || null,
    },
  });

  revalidatePath("/", "layout");
}

/**
 * Accetta una segnalazione: sposta il prodotto nella posizione indicata e la
 * marca come confermata. `locationId` permette all'admin di correggere la
 * proposta prima di applicarla.
 */
export async function acceptReport(reportId: string, locationId?: string, note?: string) {
  const admin = await requireAdmin();

  const report = await prisma.report.findUniqueOrThrow({ where: { id: reportId } });
  const target = locationId ?? report.suggestedLocationId;
  if (!target) throw new Error("Serve una posizione da applicare");

  await prisma.$transaction([
    prisma.placement.upsert({
      where: { productId_storeId: { productId: report.productId, storeId: report.storeId } },
      create: {
        productId: report.productId,
        storeId: report.storeId,
        locationId: target,
        confidence: "confirmed",
      },
      update: { locationId: target, confidence: "confirmed" },
    }),
    prisma.report.update({
      where: { id: reportId },
      data: {
        status: "accepted",
        suggestedLocationId: target,
        resolvedAt: new Date(),
        resolvedById: admin.id,
        resolutionNote: note?.trim() || null,
      },
    }),
  ]);

  revalidatePath("/", "layout");
}

export async function rejectReport(reportId: string, note?: string) {
  const admin = await requireAdmin();

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: "rejected",
      resolvedAt: new Date(),
      resolvedById: admin.id,
      resolutionNote: note?.trim() || null,
    },
  });

  revalidatePath("/", "layout");
}

// --- Posizioni prodotto (admin) -------------------------------------------

/**
 * Sposta un gruppo di prodotti in una sola mossa: serve quando un intero
 * reparto cambia corsia e correggerli uno a uno sarebbe una serata persa.
 */
export async function moveProducts(productIds: string[], storeId: string, locationId: string) {
  await requireAdmin();
  if (productIds.length === 0) return;

  const existing = await prisma.placement.findMany({
    where: { storeId, productId: { in: productIds } },
    select: { productId: true },
  });
  const known = new Set(existing.map((p) => p.productId));

  await prisma.$transaction([
    prisma.placement.updateMany({
      where: { storeId, productId: { in: [...known] } },
      data: { locationId, confidence: "confirmed" },
    }),
    prisma.placement.createMany({
      data: productIds
        .filter((id) => !known.has(id))
        .map((productId) => ({ productId, storeId, locationId, confidence: "confirmed" as const })),
    }),
  ]);

  revalidatePath("/", "layout");
}

/** Sposta in blocco tutti i prodotti di una categoria. */
export async function moveCategory(categorySlug: string, storeId: string, locationId: string) {
  await requireAdmin();

  const products = await prisma.product.findMany({
    where: { category: { slug: categorySlug } },
    select: { id: true },
  });

  await moveProducts(
    products.map((p) => p.id),
    storeId,
    locationId,
  );
}

/**
 * Un supermercato diventa utilizzabile solo quando qualcuno ne ha disegnato la
 * planimetria: finche' e' "prossimamente" non ci si puo' fare una lista.
 */
export async function setStoreStatus(storeId: string, status: "active" | "comingSoon") {
  await requireAdmin();
  await prisma.store.update({ where: { id: storeId }, data: { status } });
  revalidatePath("/", "layout");
}

/**
 * Ricava corsie e punti di prelievo dalla planimetria disegnata.
 *
 * Rigenerare cancella i punti di prelievo esistenti, e con loro le posizioni
 * dei prodotti: su un negozio gia' popolato serve una conferma esplicita,
 * altrimenti un tocco distratto butterebbe via mesi di correzioni.
 */
export async function generateAisles(
  storeId: string,
  force = false,
): Promise<
  | { ok: true; aisles: number; locations: number }
  | { ok: false; reason: "placements"; placements: number }
  | { ok: false; reason: "empty" }
> {
  await requireAdmin();

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const placements = await prisma.placement.count({ where: { storeId } });
  if (placements > 0 && !force) return { ok: false, reason: "placements", placements };

  const fixtures = await prisma.fixture.findMany({ where: { storeId } });
  const derived = deriveLayout(
    parseGrid(store.grid as string[]),
    fixtures.map((fixture) => ({
      key: fixture.id,
      kind: fixture.kind,
      label: fixture.label,
      cells: fixture.cells as number[][],
    })),
  );

  if (derived.aisles.length === 0) return { ok: false, reason: "empty" };

  await prisma.$transaction(async (tx) => {
    await tx.location.deleteMany({ where: { storeId } });
    await tx.aisle.deleteMany({ where: { storeId } });

    const aisleId = new Map<string, string>();
    for (const aisle of derived.aisles) {
      const row = await tx.aisle.create({
        data: {
          storeId,
          number: aisle.number,
          name: aisle.name,
          sequence: aisle.sequence,
          vertical: aisle.vertical,
        },
      });
      aisleId.set(aisle.key, row.id);
    }

    await tx.location.createMany({
      data: derived.locations.map((location) => ({
        storeId,
        aisleId: aisleId.get(location.aisleKey)!,
        fixtureId: location.aisleKey,
        side: location.side,
        bay: location.bay,
        accessX: location.accessX,
        accessY: location.accessY,
        label: location.label,
      })),
    });
  });

  revalidatePath("/", "layout");
  return { ok: true, aisles: derived.aisles.length, locations: derived.locations.length };
}

/** Rinomina o rinumera una corsia. Le etichette dei punti seguono il nome. */
export async function renameAisle(aisleId: string, name: string, sequence: number) {
  await requireAdmin();

  const aisle = await prisma.aisle.update({
    where: { id: aisleId },
    data: { name: name.trim() || "Corsia", sequence },
    include: { locations: true },
  });

  await Promise.all(
    aisle.locations.map((location) =>
      prisma.location.update({
        where: { id: location.id },
        data: {
          label: `${aisle.name} · scaffale ${location.bay} ${location.side === "L" ? "sx" : "dx"}`,
        },
      }),
    ),
  );

  revalidatePath("/", "layout");
}
