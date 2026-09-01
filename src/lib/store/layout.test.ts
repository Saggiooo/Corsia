import { describe, expect, test } from "vitest";
import { bfsFrom, parseGrid, UNREACHABLE } from "@/lib/routing/grid";
import { buildLayout } from "./layout";

const layout = buildLayout();
const grid = parseGrid(layout.grid);
const fromEntrance = bfsFrom(grid, { x: layout.entrance[0], y: layout.entrance[1] });

describe("planimetria di partenza", () => {
  test("la griglia ha le dimensioni dichiarate", () => {
    expect(layout.grid).toHaveLength(layout.height);
    for (const row of layout.grid) expect(row).toHaveLength(layout.width);
  });

  test("ingresso e casse sono su celle percorribili", () => {
    expect(grid.walkable(layout.entrance[0], layout.entrance[1])).toBe(true);
    expect(grid.walkable(layout.checkout[0], layout.checkout[1])).toBe(true);
  });

  test("dall'ingresso si raggiungono le casse", () => {
    expect(fromEntrance[grid.index(layout.checkout[0], layout.checkout[1])]).not.toBe(UNREACHABLE);
  });

  test("ogni punto di prelievo e' raggiungibile dall'ingresso", () => {
    const bad = layout.locations.filter(
      (l) => fromEntrance[grid.index(l.accessX, l.accessY)] === UNREACHABLE,
    );

    expect(bad.map((l) => l.label)).toEqual([]);
  });

  test("nessun punto di prelievo cade dentro un blocco", () => {
    const inside = layout.locations.filter((l) => !grid.walkable(l.accessX, l.accessY));

    expect(inside.map((l) => l.label)).toEqual([]);
  });

  test("le corsie hanno numeri unici e sequenze progressive", () => {
    const numbers = layout.aisles.map((a) => a.number);
    const sequences = layout.aisles.map((a) => a.sequence);

    expect(new Set(numbers).size).toBe(numbers.length);
    expect(sequences).toEqual([...sequences].sort((a, b) => a - b));
  });

  test("ogni punto di prelievo appartiene a una corsia esistente", () => {
    const known = new Set(layout.aisles.map((a) => a.number));
    const orphans = layout.locations.filter((l) => !known.has(l.aisleNumber));

    expect(orphans).toEqual([]);
  });

  test("le posizioni sono uniche per corsia, lato e campata", () => {
    const keys = layout.locations.map((l) => `${l.aisleNumber}/${l.side}/${l.bay}`);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
