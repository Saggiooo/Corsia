import { describe, expect, test } from "vitest";
import { parseGrid } from "./grid";
import { shortestPath } from "./path";

describe("shortestPath", () => {
  test("restituisce le celle dalla partenza all'arrivo", () => {
    const grid = parseGrid(["....", "....", "...."]);
    const path = shortestPath(grid, { x: 0, y: 0 }, { x: 3, y: 0 });

    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  test("aggira i muri con il percorso piu' corto", () => {
    const grid = parseGrid([".....", ".###.", "....."]);
    const path = shortestPath(grid, { x: 0, y: 0 }, { x: 4, y: 2 });

    expect(path).not.toBeNull();
    expect(path!.length).toBe(7);
    expect(path!.at(-1)).toEqual({ x: 4, y: 2 });
    expect(path!.every((p) => grid.walkable(p.x, p.y))).toBe(true);
  });

  test("restituisce null se l'arrivo e' murato", () => {
    const grid = parseGrid([".#.", "###", "..."]);

    expect(shortestPath(grid, { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
  });

  test("partenza uguale ad arrivo produce un percorso di una cella", () => {
    const grid = parseGrid(["..", ".."]);

    expect(shortestPath(grid, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([{ x: 1, y: 1 }]);
  });
});
