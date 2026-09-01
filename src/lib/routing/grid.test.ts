import { describe, expect, test } from "vitest";
import { parseGrid, bfsFrom, UNREACHABLE } from "./grid";

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
