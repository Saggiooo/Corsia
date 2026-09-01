import { describe, expect, test } from "vitest";
import { parseGrid } from "@/lib/routing/grid";
import { pullString, roundedPathD, splitLegs } from "./trace";

describe("pullString", () => {
  test("una scaletta in campo aperto diventa un segmento dritto", () => {
    const grid = parseGrid([".....", ".....", ".....", ".....", "....."]);
    const staircase = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ];

    expect(pullString(grid, staircase)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
    ]);
  });

  test("conserva la deviazione quando c'e' un muro in mezzo", () => {
    const grid = parseGrid([".....", ".###.", "....."]);
    const around = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 1 },
      { x: 4, y: 2 },
    ];

    const pulled = pullString(grid, around);

    expect(pulled.length).toBeGreaterThan(2);
    expect(pulled[0]).toEqual({ x: 0, y: 0 });
    expect(pulled.at(-1)).toEqual({ x: 4, y: 2 });
  });

  test("percorsi di uno o zero punti restano invariati", () => {
    const grid = parseGrid([".."]);

    expect(pullString(grid, [])).toEqual([]);
    expect(pullString(grid, [{ x: 0, y: 0 }])).toEqual([{ x: 0, y: 0 }]);
  });
});

describe("roundedPathD", () => {
  test("due punti danno un segmento dritto", () => {
    expect(roundedPathD([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2)).toBe("M 0 0 L 10 0");
  });

  test("un angolo viene raccordato con una curva quadratica", () => {
    const d = roundedPathD(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      3,
    );

    expect(d.startsWith("M 0 0")).toBe(true);
    expect(d).toContain("Q 10 0");
    expect(d.endsWith("L 10 10")).toBe(true);
  });

  test("un percorso vuoto non produce comandi", () => {
    expect(roundedPathD([], 3)).toBe("");
  });
});

describe("splitLegs", () => {
  test("spezza il tracciato in tratte che finiscono su ogni tappa", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];

    const legs = splitLegs(path, [
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ]);

    expect(legs).toHaveLength(3);
    expect(legs[0].at(-1)).toEqual({ x: 2, y: 0 });
    expect(legs[1].at(-1)).toEqual({ x: 3, y: 0 });
    expect(legs[2].at(-1)).toEqual({ x: 4, y: 0 });
  });

  test("le tratte si agganciano: ogni tratta riparte dalla tappa precedente", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
    ];

    const legs = splitLegs(path, [{ x: 2, y: 0 }]);

    expect(legs[1][0]).toEqual({ x: 2, y: 0 });
  });

  test("una tappa visitata due volte usa il primo passaggio utile", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];

    const legs = splitLegs(path, [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ]);

    expect(legs[0]).toHaveLength(2);
    expect(legs[1].at(-1)).toEqual({ x: 0, y: 0 });
  });

  test("senza tappe restituisce il tracciato intero come unica tratta", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];

    expect(splitLegs(path, [])).toEqual([path]);
  });
});
