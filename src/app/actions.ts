"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/queries";
import { bfsFrom, parseGrid, UNREACHABLE } from "@/lib/routing/grid";
import { groupCells } from "@/lib/map/shapes";
import { buildRoute, type PickClass, type RouteStop } from "@/lib/routing/route";
import type { OrphanSnapshot, StopSnapshot } from "@/lib/route-types";

function defaultListName(): string {
  const now = new Date();
  return new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long" })
    .format(now)
    .replace(/^\w/, (c) => c.toUpperCase());
}

export async function createList() {
  const store = await getStore();
  const list = await prisma.list.create({
    data: { storeId: store.id, name: defaultListName() },
  });
  revalidatePath("/");
  redirect(`/liste/${list.id}`);
}

export async function renameList(listId: string, name: string) {
  await prisma.list.update({ where: { id: listId }, data: { name: name.trim() || defaultListName() } });
  revalidatePath(`/liste/${listId}`);
}

export async function deleteList(listId: string) {
  await prisma.list.delete({ where: { id: listId } });
  revalidatePath("/");
  redirect("/");
}

export async function addProduct(listId: string, productId: string) {
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
  const rawText = text.trim();
  if (!rawText) return;

  const count = await prisma.listItem.count({ where: { listId } });
  await prisma.listItem.create({ data: { listId, rawText, sortIndex: count } });

  await invalidateRoute(listId);
  revalidatePath(`/liste/${listId}`);
}

export async function setQty(itemId: string, qty: number) {
  const item = await prisma.listItem.findUniqueOrThrow({ where: { id: itemId } });

  if (qty <= 0) {
    await prisma.listItem.delete({ where: { id: itemId } });
    await invalidateRoute(item.listId);
  } else {
    await prisma.listItem.update({ where: { id: itemId }, data: { qty } });
  }

  revalidatePath(`/liste/${item.listId}`);
}

export async function removeItem(itemId: string) {
  const item = await prisma.listItem.delete({ where: { id: itemId } });
  await invalidateRoute(item.listId);
  revalidatePath(`/liste/${item.listId}`);
}

/**
 * Nota personale sulla riga: il catalogo tiene prodotti generici ("Spaghetti"),
 * qui ci scrivi quello che vuoi davvero ("Barilla mezzo kg"). Non cambia la
 * posizione a scaffale, quindi non invalida il percorso.
 */
export async function setNote(itemId: string, note: string): Promise<void> {
  const trimmed = note.trim();
  const item = await prisma.listItem.update({
    where: { id: itemId },
    data: { note: trimmed || null },
  });
  revalidatePath(`/liste/${item.listId}`, "layout");
}

export async function toggleChecked(itemId: string, checked: boolean): Promise<void> {
  const item = await prisma.listItem.update({
    where: { id: itemId },
    data: { checked, checkedAt: checked ? new Date() : null },
  });
  revalidatePath(`/liste/${item.listId}/spesa`);
}

/**
 * Sposta un prodotto su un nuovo punto di prelievo e lo marca come confermato:
 * e' il modo in cui la mappa impara mentre si fa la spesa.
 */
export async function movePlacement(productId: string, locationId: string, level?: number | null) {
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
  await prisma.list.update({
    where: { id: listId },
    data: { status: "shopping", startedAt: new Date() },
  });
  redirect(`/liste/${listId}/spesa`);
}

export async function finishShopping(listId: string) {
  const items = await prisma.listItem.findMany({
    where: { listId, checked: true, productId: { not: null } },
    select: { productId: true },
  });

  await prisma.$transaction([
    ...items.map((item) =>
      prisma.product.update({
        where: { id: item.productId! },
        data: { timesBought: { increment: 1 } },
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

export async function setRouteMode(mode: "shortest" | "coldchain") {
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

export type CellPaint = { x: number; y: number; kind: string; color?: string | null };

/**
 * Salva la planimetria disegnata nell'editor: ricalcola la griglia di
 * percorribilita' e ricostruisce i blocchi raggruppando le celle contigue
 * dello stesso tipo. Corsie e punti di prelievo restano invariati; se qualche
 * punto finisce sotto un blocco, la funzione lo segnala invece di nasconderlo.
 */
export async function saveMap(input: {
  cells: CellPaint[];
  entrance: [number, number];
  checkout: [number, number];
}): Promise<{ blocked: string[]; unreachable: string[] }> {
  const store = await getStore();

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

  // Raggruppo per tipo *e* colore: cosi' modificare uno scaffale non appiattisce
  // i colori di reparto dei banchi che non hai toccato.
  const byStyle = new Map<string, number[][]>();
  for (const cell of input.cells) {
    const style = `${cell.kind}::${cell.color ?? ""}`;
    byStyle.set(style, [...(byStyle.get(style) ?? []), [cell.x, cell.y]]);
  }

  await prisma.$transaction(async (tx) => {
    await tx.fixture.deleteMany({ where: { storeId: store.id } });

    for (const [style, cells] of byStyle) {
      const [kind, color] = style.split("::");
      for (const group of groupCells(cells)) {
        await tx.fixture.create({
          data: {
            storeId: store.id,
            kind: kind as never,
            colorToken: color || KIND_COLOR[kind] || null,
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
