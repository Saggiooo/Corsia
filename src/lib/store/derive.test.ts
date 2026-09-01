import { describe, expect, test } from "vitest";
import { parseGrid } from "@/lib/routing/grid";
import { deriveLayout, type DerivableFixture } from "./derive";

/** Negozio vuoto con muri perimetrali. */
function emptyStore(w: number, h: number): string[] {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => (x === 0 || y === 0 || x === w - 1 || y === h - 1 ? "#" : ".")).join(""),
  );
}

function withBlocks(w: number, h: number, fixtures: DerivableFixture[]): string[] {
  const rows = emptyStore(w, h).map((row) => row.split(""));
  for (const fixture of fixtures) {
    for (const [x, y] of fixture.cells) rows[y][x] = "#";
  }
  return rows.map((row) => row.join(""));
}

function block(key: string, kind: DerivableFixture["kind"], x0: number, x1: number, y0: number, y1: number, label?: string): DerivableFixture {
  const cells: number[][] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push([x, y]);
  return { key, kind, label, cells };
}

describe("deriveLayout", () => {
  test("uno scaffale verticale diventa una corsia con i suoi due lati", () => {
    const fixtures = [block("s1", "shelf", 5, 6, 4, 13)];
    const grid = parseGrid(withBlocks(20, 20, fixtures));

    const { aisles, locations } = deriveLayout(grid, fixtures);

    expect(aisles).toHaveLength(1);
    expect(aisles[0].vertical).toBe(true);
    expect(new Set(locations.map((l) => l.side))).toEqual(new Set(["L", "R"]));
    // Faccia di 10 celle, campate da 5: due per lato.
    expect(locations.filter((l) => l.side === "L")).toHaveLength(2);
    expect(locations.filter((l) => l.side === "R")).toHaveLength(2);
  });

  test("i punti di prelievo cadono su celle percorribili accanto allo scaffale", () => {
    const fixtures = [block("s1", "shelf", 5, 6, 4, 13)];
    const grid = parseGrid(withBlocks(20, 20, fixtures));

    const { locations } = deriveLayout(grid, fixtures);

    for (const location of locations) {
      expect(grid.walkable(location.accessX, location.accessY)).toBe(true);
      expect(Math.min(Math.abs(location.accessX - 4), Math.abs(location.accessX - 7))).toBe(0);
    }
  });

  test("un banco orizzontale con etichetta prende il nome dall'etichetta", () => {
    const fixtures = [block("orto", "counter", 3, 14, 4, 6, "Ortofrutta")];
    const grid = parseGrid(withBlocks(20, 20, fixtures));

    const { aisles } = deriveLayout(grid, fixtures);

    expect(aisles).toHaveLength(1);
    expect(aisles[0].name).toBe("Ortofrutta");
    expect(aisles[0].vertical).toBe(false);
  });

  test("muri, casse e ingresso non generano corsie", () => {
    const fixtures = [
      block("muro", "wall", 5, 6, 4, 10),
      block("cassa", "checkout", 10, 12, 4, 6),
      block("porta", "entrance", 2, 2, 2, 2),
    ];
    const grid = parseGrid(withBlocks(20, 20, fixtures));

    expect(deriveLayout(grid, fixtures).aisles).toEqual([]);
  });

  test("un lato appoggiato al muro non genera punti di prelievo", () => {
    // Scaffale attaccato al muro sinistro: solo la faccia destra e' raggiungibile.
    const fixtures = [block("s1", "shelf", 1, 2, 4, 13)];
    const grid = parseGrid(withBlocks(20, 20, fixtures));

    const { locations } = deriveLayout(grid, fixtures);

    expect(new Set(locations.map((l) => l.side))).toEqual(new Set(["R"]));
  });

  test("le corsie sono numerate e la sequenza segue una serpentina", () => {
    const fixtures = [
      block("a", "shelf", 4, 5, 3, 8),
      block("b", "shelf", 9, 10, 3, 8),
      block("c", "shelf", 14, 15, 3, 8),
    ];
    const grid = parseGrid(withBlocks(24, 24, fixtures));

    const { aisles } = deriveLayout(grid, fixtures);

    expect(aisles.map((a) => a.number)).toEqual([1, 2, 3]);
    expect(aisles.map((a) => a.sequence)).toEqual([1, 2, 3]);
  });

  test("ogni punto di prelievo e' unico per corsia, lato e campata", () => {
    const fixtures = [
      block("a", "shelf", 4, 5, 3, 16),
      block("b", "shelf", 9, 10, 3, 16),
    ];
    const grid = parseGrid(withBlocks(24, 24, fixtures));

    const { locations } = deriveLayout(grid, fixtures);
    const keys = locations.map((l) => `${l.aisleKey}/${l.side}/${l.bay}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  test("senza blocchi utili non si genera niente", () => {
    const grid = parseGrid(emptyStore(20, 20));

    expect(deriveLayout(grid, [])).toEqual({ aisles: [], locations: [] });
  });
});
