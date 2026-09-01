import { describe, expect, test } from "vitest";
import { groupCells, mergeCells } from "./shapes";

describe("mergeCells", () => {
  test("un blocco pieno diventa un solo rettangolo", () => {
    const rects = mergeCells([
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]);

    expect(rects).toEqual([{ x: 0, y: 0, w: 2, h: 2 }]);
  });

  test("una singola cella resta un rettangolo unitario", () => {
    expect(mergeCells([[3, 4]])).toEqual([{ x: 3, y: 4, w: 1, h: 1 }]);
  });

  test("una forma a L viene coperta senza sovrapposizioni ne' buchi", () => {
    const cells: [number, number][] = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ];

    const rects = mergeCells(cells);
    const covered = new Set<string>();

    for (const r of rects) {
      for (let y = r.y; y < r.y + r.h; y++) {
        for (let x = r.x; x < r.x + r.w; x++) {
          const key = `${x},${y}`;
          expect(covered.has(key)).toBe(false);
          covered.add(key);
        }
      }
    }

    expect(covered.size).toBe(cells.length);
    for (const [x, y] of cells) expect(covered.has(`${x},${y}`)).toBe(true);
  });

  test("blocchi separati restano rettangoli distinti", () => {
    const rects = mergeCells([
      [0, 0],
      [5, 0],
    ]);

    expect(rects).toHaveLength(2);
  });

  test("nessuna cella, nessun rettangolo", () => {
    expect(mergeCells([])).toEqual([]);
  });
});

describe("groupCells", () => {
  test("celle contigue formano un solo gruppo", () => {
    const groups = groupCells([
      [0, 0],
      [1, 0],
      [1, 1],
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });

  test("celle separate formano gruppi distinti", () => {
    const groups = groupCells([
      [0, 0],
      [5, 5],
      [5, 6],
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.length).sort()).toEqual([1, 2]);
  });

  test("il contatto in diagonale non unisce i gruppi", () => {
    const groups = groupCells([
      [0, 0],
      [1, 1],
    ]);

    expect(groups).toHaveLength(2);
  });

  test("nessuna cella, nessun gruppo", () => {
    expect(groupCells([])).toEqual([]);
  });
});
