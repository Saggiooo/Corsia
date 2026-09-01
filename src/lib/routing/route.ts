import { bfsFrom, UNREACHABLE, type Grid, type Point } from "./grid";
import { shortestPath } from "./path";
import { solveOrder } from "./tsp";

export type PickClass = "normal" | "fragile" | "chilled" | "frozen";

/** Ordine di raccolta per classe: la roba delicata e fredda va presa per ultima. */
const PICK_CLASS_ORDER: PickClass[] = ["normal", "fragile", "chilled", "frozen"];

export type RouteStop = {
  id: string;
  x: number;
  y: number;
  /** Ordine naturale della corsia nel negozio, usato come seed dell'euristica. */
  aisleSequence: number;
  pickClass: PickClass;
};

export type RouteMode = "shortest" | "coldchain";

export type RouteInput = {
  grid: Grid;
  start: Point;
  end: Point;
  stops: RouteStop[];
  cellSizeCm: number;
  mode: RouteMode;
  walkSpeedMs?: number;
  secondsPerPick?: number;
  /** Costo aggiuntivo, in celle, per passare da una corsia a un'altra. */
  aisleSwitchPenaltyCells?: number;
};

export type RouteResult = {
  order: RouteStop[];
  unreachable: RouteStop[];
  path: Point[];
  distanceM: number;
  estMinutes: number;
};

const DEFAULTS = {
  walkSpeedMs: 1.1,
  secondsPerPick: 20,
  aisleSwitchPenaltyCells: 4,
};

/**
 * Calcola ordine di raccolta e tracciato per una lista della spesa.
 *
 * 1. Colassa le tappe sulla stessa cella, misura le distanze reali con una BFS
 *    per nodo, scarta quelle irraggiungibili.
 * 2. Ordina le tappe (esatto o euristico, vedi `solveOrder`), a blocchi per
 *    classe di raccolta quando la modalita' e' `coldchain`.
 * 3. Ricostruisce il tracciato cella per cella e stima distanza e durata.
 */
export function buildRoute(input: RouteInput): RouteResult {
  const walkSpeedMs = input.walkSpeedMs ?? DEFAULTS.walkSpeedMs;
  const secondsPerPick = input.secondsPerPick ?? DEFAULTS.secondsPerPick;
  const penalty = input.aisleSwitchPenaltyCells ?? DEFAULTS.aisleSwitchPenaltyCells;

  const nodes: Point[] = [input.start, input.end];
  const stopNode: number[] = [];

  // Tappe sulla stessa cella condividono un solo nodo.
  const byCell = new Map<string, number>();
  for (const s of input.stops) {
    const key = `${s.x},${s.y}`;
    let node = byCell.get(key);
    if (node === undefined) {
      node = nodes.length;
      nodes.push({ x: s.x, y: s.y });
      byCell.set(key, node);
    }
    stopNode.push(node);
  }

  const fields = nodes.map((n) => bfsFrom(input.grid, n));
  const dist = nodes.map((_, i) =>
    nodes.map((n, j) => {
      const d = fields[i][input.grid.index(n.x, n.y)];
      return d === UNREACHABLE ? Infinity : d;
    }),
  );

  const reachable: RouteStop[] = [];
  const unreachable: RouteStop[] = [];
  input.stops.forEach((s, i) => {
    const node = stopNode[i];
    const usable = Number.isFinite(dist[0][node]) && Number.isFinite(dist[node][1]);
    (usable ? reachable : unreachable).push(s);
  });

  const nodeOf = new Map<string, number>();
  input.stops.forEach((s, i) => nodeOf.set(s.id, stopNode[i]));

  const cost = applyAislePenalty(dist, nodeOf, reachable, penalty);

  const blocks =
    input.mode === "coldchain"
      ? PICK_CLASS_ORDER.map((c) => reachable.filter((s) => s.pickClass === c)).filter((b) => b.length > 0)
      : [reachable];

  const order: RouteStop[] = [];
  let from = 0;

  blocks.forEach((block, blockIndex) => {
    const last = blockIndex === blocks.length - 1;
    const to = last ? 1 : -1;

    // Blocco intermedio: l'arrivo e' libero, si usa un nodo fittizio a costo nullo.
    const matrix = to === -1 ? withFreeEnd(cost) : cost;
    const endNode = to === -1 ? matrix.length - 1 : 1;

    const middle = dedupe(block.map((s) => nodeOf.get(s.id)!)).sort(
      (a, b) => seqOf(a, nodeOf, block) - seqOf(b, nodeOf, block),
    );
    const solved = solveOrder(matrix, from, endNode, middle);
    const inner = solved.slice(1, -1);

    for (const node of inner) {
      for (const s of block) {
        if (nodeOf.get(s.id) === node) order.push(s);
      }
    }

    if (inner.length > 0) from = inner[inner.length - 1];
  });

  const waypoints = [input.start, ...dedupe(order.map((s) => nodeOf.get(s.id)!)).map((n) => nodes[n]), input.end];
  const path = stitch(input.grid, waypoints);

  const cells = Math.max(path.length - 1, 0);
  const distanceM = Math.round((cells * input.cellSizeCm) / 100);
  const seconds = distanceM / walkSpeedMs + order.length * secondsPerPick;

  return {
    order,
    unreachable,
    path,
    distanceM,
    estMinutes: Math.max(1, Math.round(seconds / 60)),
  };
}

/** Aggiunge il costo di cambio corsia alle coppie di tappe in corsie diverse. */
function applyAislePenalty(
  dist: number[][],
  nodeOf: Map<string, number>,
  stops: RouteStop[],
  penalty: number,
): number[][] {
  if (penalty <= 0) return dist;

  const aisleOfNode = new Map<number, number>();
  for (const s of stops) aisleOfNode.set(nodeOf.get(s.id)!, s.aisleSequence);

  return dist.map((row, i) =>
    row.map((value, j) => {
      const a = aisleOfNode.get(i);
      const b = aisleOfNode.get(j);
      if (a === undefined || b === undefined || a === b) return value;
      return value + penalty;
    }),
  );
}

/** Matrice estesa con un nodo di arrivo a costo zero da ogni tappa. */
function withFreeEnd(dist: number[][]): number[][] {
  const size = dist.length;
  const extended = dist.map((row) => [...row, 0]);
  extended.push(new Array(size + 1).fill(0));
  return extended;
}

function seqOf(node: number, nodeOf: Map<string, number>, stops: RouteStop[]): number {
  for (const s of stops) if (nodeOf.get(s.id) === node) return s.aisleSequence;
  return 0;
}

function dedupe(values: number[]): number[] {
  const seen = new Set<number>();
  return values.filter((v) => (seen.has(v) ? false : (seen.add(v), true)));
}

/** Concatena i tratti fra waypoint consecutivi evitando di ripetere le giunzioni. */
function stitch(grid: Grid, waypoints: Point[]): Point[] {
  const path: Point[] = [];

  for (let i = 1; i < waypoints.length; i++) {
    const leg = shortestPath(grid, waypoints[i - 1], waypoints[i]);
    if (!leg) continue;
    path.push(...(path.length === 0 ? leg : leg.slice(1)));
  }

  return path;
}
