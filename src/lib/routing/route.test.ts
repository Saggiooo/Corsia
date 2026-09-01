import { describe, expect, test } from "vitest";
import { parseGrid } from "./grid";
import { buildRoute, type RouteStop } from "./route";

const corridor = parseGrid(["..........."]);

function stop(id: string, x: number, extra: Partial<RouteStop> = {}): RouteStop {
  return { id, x, y: 0, aisleSequence: 1, pickClass: "normal", ...extra };
}

const base = {
  grid: corridor,
  start: { x: 0, y: 0 },
  end: { x: 10, y: 0 },
  cellSizeCm: 50,
};

describe("buildRoute", () => {
  test("ordina le tappe per percorso piu' corto", () => {
    const result = buildRoute({
      ...base,
      mode: "shortest",
      stops: [stop("lontano", 8), stop("vicino", 2)],
    });

    expect(result.order.map((s) => s.id)).toEqual(["vicino", "lontano"]);
  });

  test("in modalita' catena del freddo i surgelati vengono presi per ultimi", () => {
    const result = buildRoute({
      ...base,
      mode: "coldchain",
      stops: [stop("pasta", 8), stop("gelato", 2, { pickClass: "frozen" })],
    });

    expect(result.order.map((s) => s.id)).toEqual(["pasta", "gelato"]);
  });

  test("l'ordine per classe e' normale, fragile, fresco, surgelato", () => {
    const result = buildRoute({
      ...base,
      mode: "coldchain",
      stops: [
        stop("gelato", 1, { pickClass: "frozen" }),
        stop("yogurt", 3, { pickClass: "chilled" }),
        stop("uova", 5, { pickClass: "fragile" }),
        stop("riso", 7),
      ],
    });

    expect(result.order.map((s) => s.id)).toEqual(["riso", "uova", "yogurt", "gelato"]);
  });

  test("una penalita' alta sul cambio corsia raggruppa le tappe per corsia", () => {
    const result = buildRoute({
      ...base,
      mode: "shortest",
      aisleSwitchPenaltyCells: 50,
      stops: [
        stop("a1", 2, { aisleSequence: 1 }),
        stop("b1", 4, { aisleSequence: 2 }),
        stop("a2", 6, { aisleSequence: 1 }),
        stop("b2", 8, { aisleSequence: 2 }),
      ],
    });

    const aisles = result.order.map((s) => s.aisleSequence);
    const switches = aisles.filter((a, i) => i > 0 && a !== aisles[i - 1]).length;
    expect(switches).toBe(1);
  });

  test("le tappe irraggiungibili sono segnalate e non bloccano il percorso", () => {
    // (1,2) e' chiusa da muri su tutti e quattro i lati.
    const grid = parseGrid(["....", "###.", "#.##"]);
    const result = buildRoute({
      grid,
      start: { x: 0, y: 0 },
      end: { x: 3, y: 1 },
      cellSizeCm: 50,
      mode: "shortest",
      stops: [stop("ok", 2), stop("murato", 1, { y: 2 })],
    });

    expect(result.order.map((s) => s.id)).toEqual(["ok"]);
    expect(result.unreachable.map((s) => s.id)).toEqual(["murato"]);
  });

  test("il tracciato e' continuo e tocca partenza, tappe e arrivo", () => {
    const result = buildRoute({
      ...base,
      mode: "shortest",
      stops: [stop("uno", 3), stop("due", 7)],
    });

    expect(result.path[0]).toEqual({ x: 0, y: 0 });
    expect(result.path.at(-1)).toEqual({ x: 10, y: 0 });
    expect(result.path).toContainEqual({ x: 3, y: 0 });

    for (let i = 1; i < result.path.length; i++) {
      const step =
        Math.abs(result.path[i].x - result.path[i - 1].x) +
        Math.abs(result.path[i].y - result.path[i - 1].y);
      expect(step).toBe(1);
    }
  });

  test("converte la distanza in metri e stima i minuti", () => {
    const result = buildRoute({
      ...base,
      mode: "shortest",
      stops: [stop("uno", 5)],
      walkSpeedMs: 1,
      secondsPerPick: 20,
    });

    // 10 celle da 50 cm = 5 m, piu' 20 s per un prodotto.
    expect(result.distanceM).toBe(5);
    expect(result.estMinutes).toBe(1);
  });

  test("una lista senza tappe collega comunque ingresso e casse", () => {
    const result = buildRoute({ ...base, mode: "shortest", stops: [] });

    expect(result.order).toEqual([]);
    expect(result.path.at(-1)).toEqual({ x: 10, y: 0 });
  });
});
