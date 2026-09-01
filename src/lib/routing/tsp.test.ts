import { describe, expect, test } from "vitest";
import { solveOrder } from "./tsp";

/** Matrice di distanze fra punti su una retta: l'ordine ottimo e' quello crescente. */
function lineMatrix(positions: number[]): number[][] {
  return positions.map((a) => positions.map((b) => Math.abs(a - b)));
}

function totalLength(dist: number[][], order: number[]): number {
  let total = 0;
  for (let i = 1; i < order.length; i++) total += dist[order[i - 1]][order[i]];
  return total;
}

describe("solveOrder", () => {
  test("con lista vuota collega solo partenza e arrivo", () => {
    const dist = lineMatrix([0, 50]);

    expect(solveOrder(dist, 0, 1, [])).toEqual([0, 1]);
  });

  test("riordina poche tappe in modo esatto", () => {
    //            0    1    2    3    4
    const dist = lineMatrix([0, 30, 10, 20, 50]);

    const order = solveOrder(dist, 0, 4, [1, 2, 3]);

    expect(order).toEqual([0, 2, 3, 1, 4]);
    expect(totalLength(dist, order)).toBe(50);
  });

  test("oltre il limite del solver esatto resta comunque ottimo su una retta", () => {
    const positions = [0, 100];
    const middle: number[] = [];
    for (let i = 0; i < 18; i++) {
      positions.push(5 + i * 5);
      middle.push(i + 2);
    }
    const dist = lineMatrix(positions);
    const scrambled = [...middle].reverse();

    const order = solveOrder(dist, 0, 1, scrambled);

    expect(order[0]).toBe(0);
    expect(order.at(-1)).toBe(1);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, ...middle].sort((a, b) => a - b));
    expect(totalLength(dist, order)).toBe(100);
  });

  test("mantiene tutte le tappe senza duplicarle", () => {
    const dist = lineMatrix([0, 9, 4, 7, 1, 12]);

    const order = solveOrder(dist, 0, 5, [1, 2, 3, 4]);

    expect(new Set(order).size).toBe(6);
    expect(order).toHaveLength(6);
  });
});
