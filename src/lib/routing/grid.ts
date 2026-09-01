/** Distanza restituita da {@link bfsFrom} per una cella non raggiungibile. */
export const UNREACHABLE = -1;

export type Point = { x: number; y: number };

export type Grid = {
  w: number;
  h: number;
  /** true se ci si puo' camminare sopra. Fuori dai bordi e' sempre false. */
  walkable(x: number, y: number): boolean;
  /** Indice lineare della cella, per accedere agli array di distanze. */
  index(x: number, y: number): number;
};

/**
 * Costruisce una griglia dalle righe della planimetria.
 * '#' e' una cella occupata, qualsiasi altro carattere e' percorribile.
 */
export function parseGrid(rows: string[]): Grid {
  const h = rows.length;
  const w = h === 0 ? 0 : Math.max(...rows.map((r) => r.length));
  const cells = new Uint8Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      cells[y * w + x] = rows[y][x] === "#" ? 0 : 1;
    }
  }

  return {
    w,
    h,
    index: (x, y) => y * w + x,
    walkable: (x, y) => x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x] === 1,
  };
}

/**
 * Distanze in celle da `start` a ogni cella della griglia.
 * Movimento a 4 direzioni: le corsie sono ortogonali e il tracciato viene
 * comunque raddolcito a valle dallo string-pulling.
 */
export function bfsFrom(grid: Grid, start: Point): Int32Array {
  const dist = new Int32Array(grid.w * grid.h).fill(UNREACHABLE);
  if (!grid.walkable(start.x, start.y)) return dist;

  const queue = new Int32Array(grid.w * grid.h);
  let head = 0;
  let tail = 0;

  dist[grid.index(start.x, start.y)] = 0;
  queue[tail++] = grid.index(start.x, start.y);

  while (head < tail) {
    const cell = queue[head++];
    const x = cell % grid.w;
    const y = (cell - x) / grid.w;
    const next = dist[cell] + 1;

    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid.walkable(nx, ny)) continue;

      const ni = grid.index(nx, ny);
      if (dist[ni] !== UNREACHABLE) continue;

      dist[ni] = next;
      queue[tail++] = ni;
    }
  }

  return dist;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
