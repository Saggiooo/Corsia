export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Fonde le celle contigue nel minor numero ragionevole di rettangoli, cosi' che
 * un blocco di scaffali venga disegnato come una forma sola invece che come una
 * griglia di quadratini.
 *
 * Strategia greedy: per ogni cella non ancora coperta, allarga prima in
 * orizzontale finche' puo', poi in verticale finche' l'intera riga e' libera.
 * La copertura e' esatta e senza sovrapposizioni.
 */
export function mergeCells(cells: readonly number[][]): Rect[] {
  const present = new Set(cells.map(([x, y]) => key(x, y)));
  const used = new Set<string>();
  const rects: Rect[] = [];

  const sorted = [...cells].sort((a, b) => a[1] - b[1] || a[0] - b[0]);

  for (const [x, y] of sorted) {
    if (used.has(key(x, y))) continue;

    let w = 1;
    while (present.has(key(x + w, y)) && !used.has(key(x + w, y))) w++;

    let h = 1;
    while (rowIsFree(present, used, x, y + h, w)) h++;

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) used.add(key(x + dx, y + dy));
    }

    rects.push({ x, y, w, h });
  }

  return rects;
}

function rowIsFree(present: Set<string>, used: Set<string>, x: number, y: number, w: number): boolean {
  for (let dx = 0; dx < w; dx++) {
    if (!present.has(key(x + dx, y)) || used.has(key(x + dx, y))) return false;
  }
  return true;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Raggruppa le celle in componenti connesse a 4 direzioni: e' cosi' che le
 * pennellate dell'editor tornano a essere blocchi distinti sulla mappa.
 */
export function groupCells(cells: readonly number[][]): number[][][] {
  const remaining = new Set(cells.map(([x, y]) => key(x, y)));
  const groups: number[][][] = [];

  for (const [x, y] of cells) {
    if (!remaining.has(key(x, y))) continue;

    const group: number[][] = [];
    const stack = [[x, y]];
    remaining.delete(key(x, y));

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      group.push([cx, cy]);

      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const k = key(cx + dx, cy + dy);
        if (!remaining.has(k)) continue;
        remaining.delete(k);
        stack.push([cx + dx, cy + dy]);
      }
    }

    groups.push(group);
  }

  return groups;
}
