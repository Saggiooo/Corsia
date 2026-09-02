import { describe, expect, test } from "vitest";
import { parseGrid, bfsFrom, nearestWalkable, UNREACHABLE } from "./grid";

describe("parseGrid", () => {
  test("legge dimensioni e percorribilita' dalle righe", () => {
    const grid = parseGrid(["...", ".#.", "..."]);

    expect(grid.w).toBe(3);
    expect(grid.h).toBe(3);
    expect(grid.walkable(0, 0)).toBe(true);
    expect(grid.walkable(1, 1)).toBe(false);
  });

  test("le celle fuori dai bordi non sono percorribili", () => {
    const grid = parseGrid(["..", ".."]);

    expect(grid.walkable(-1, 0)).toBe(false);
    expect(grid.walkable(2, 0)).toBe(false);
    expect(grid.walkable(0, 2)).toBe(false);
  });
});

describe("bfsFrom", () => {
  test("misura la distanza in celle aggirando gli ostacoli", () => {
    const grid = parseGrid([".....", ".###.", "....."]);
    const dist = bfsFrom(grid, { x: 0, y: 0 });

    expect(dist[grid.index(0, 0)]).toBe(0);
    expect(dist[grid.index(1, 0)]).toBe(1);
    // Per arrivare a (4,2) deve girare attorno al muro: 4 a destra + 2 in giu'.
    expect(dist[grid.index(4, 2)]).toBe(6);
  });

  test("marca come irraggiungibili le celle chiuse dai muri", () => {
    const grid = parseGrid([".#.", "###", "..."]);
    const dist = bfsFrom(grid, { x: 0, y: 0 });

    expect(dist[grid.index(2, 0)]).toBe(UNREACHABLE);
    expect(dist[grid.index(1, 1)]).toBe(UNREACHABLE);
  });
});

describe("nearestWalkable", () => {
  test("lascia dov'e' una cella gia' percorribile", () => {
    const grid = parseGrid(["...", ".#.", "..."]);

    expect(nearestWalkable(grid, { x: 2, y: 2 })).toEqual({ x: 2, y: 2 });
  });

  test("sposta un segnaposto finito dentro un blocco sulla cella libera accanto", () => {
    // Casse disegnate come blocco: il segnaposto ci finisce sopra.
    const grid = parseGrid([".....", ".###.", "....."]);
    const moved = nearestWalkable(grid, { x: 2, y: 1 })!;

    expect(grid.walkable(moved.x, moved.y)).toBe(true);
    expect(Math.abs(moved.x - 2) + Math.abs(moved.y - 1)).toBe(1);
  });

  test("esce anche da un blocco spesso", () => {
    const grid = parseGrid([".....", ".###.", ".###.", ".###.", "....."]);
    const moved = nearestWalkable(grid, { x: 2, y: 2 })!;

    expect(grid.walkable(moved.x, moved.y)).toBe(true);
    expect(Math.abs(moved.x - 2) + Math.abs(moved.y - 2)).toBe(2);
  });

  test("restituisce null se non c'e' nessuna cella libera", () => {
    expect(nearestWalkable(parseGrid(["##", "##"]), { x: 0, y: 0 })).toBeNull();
  });
});
