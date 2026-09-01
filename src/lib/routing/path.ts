import { UNREACHABLE, type Grid, type Point } from "./grid";

/**
 * Percorso piu' corto in celle da `from` a `to`, estremi inclusi.
 * Restituisce null se l'arrivo non e' raggiungibile.
 *
 * A* con euristica Manhattan, ammissibile perche' il movimento e' a 4 direzioni
 * e ogni passo costa 1.
 */
export function shortestPath(grid: Grid, from: Point, to: Point): Point[] | null {
  if (!grid.walkable(from.x, from.y) || !grid.walkable(to.x, to.y)) return null;

  const size = grid.w * grid.h;
  const start = grid.index(from.x, from.y);
  const goal = grid.index(to.x, to.y);

  const gScore = new Int32Array(size).fill(UNREACHABLE);
  const cameFrom = new Int32Array(size).fill(UNREACHABLE);
  const open = new BinaryHeap();

  gScore[start] = 0;
  open.push(start, manhattan(from, to));

  while (open.size > 0) {
    const cell = open.pop();
    if (cell === goal) return reconstruct(grid, cameFrom, goal);

    const x = cell % grid.w;
    const y = (cell - x) / grid.w;
    const tentative = gScore[cell] + 1;

    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid.walkable(nx, ny)) continue;

      const ni = grid.index(nx, ny);
      if (gScore[ni] !== UNREACHABLE && gScore[ni] <= tentative) continue;

      gScore[ni] = tentative;
      cameFrom[ni] = cell;
      open.push(ni, tentative + Math.abs(nx - to.x) + Math.abs(ny - to.y));
    }
  }

  return null;
}

function reconstruct(grid: Grid, cameFrom: Int32Array, goal: number): Point[] {
  const path: Point[] = [];
  let cell = goal;

  while (cell !== UNREACHABLE) {
    const x = cell % grid.w;
    path.push({ x, y: (cell - x) / grid.w });
    cell = cameFrom[cell];
  }

  return path.reverse();
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Min-heap binario su coppie (cella, priorita'). */
class BinaryHeap {
  private cells: number[] = [];
  private priorities: number[] = [];

  get size(): number {
    return this.cells.length;
  }

  push(cell: number, priority: number): void {
    this.cells.push(cell);
    this.priorities.push(priority);

    let i = this.cells.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent] <= this.priorities[i]) break;
      this.swap(parent, i);
      i = parent;
    }
  }

  pop(): number {
    const top = this.cells[0];
    const cell = this.cells.pop()!;
    const priority = this.priorities.pop()!;

    if (this.cells.length > 0) {
      this.cells[0] = cell;
      this.priorities[0] = priority;

      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;

        if (left < this.cells.length && this.priorities[left] < this.priorities[smallest]) smallest = left;
        if (right < this.cells.length && this.priorities[right] < this.priorities[smallest]) smallest = right;
        if (smallest === i) break;

        this.swap(smallest, i);
        i = smallest;
      }
    }

    return top;
  }

  private swap(a: number, b: number): void {
    [this.cells[a], this.cells[b]] = [this.cells[b], this.cells[a]];
    [this.priorities[a], this.priorities[b]] = [this.priorities[b], this.priorities[a]];
  }
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;
