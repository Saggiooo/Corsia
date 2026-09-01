import type { Grid, Point } from "@/lib/routing/grid";

/**
 * String-pulling: elimina i punti intermedi finche' il segmento diretto resta
 * dentro le zone percorribili. Trasforma la scaletta ortogonale della BFS in
 * pochi tratti lunghi, che e' come si legge un percorso su una mappa.
 */
export function pullString(grid: Grid, path: Point[]): Point[] {
  if (path.length <= 2) return [...path];

  const pulled: Point[] = [path[0]];
  let anchor = 0;

  while (anchor < path.length - 1) {
    let farthest = anchor + 1;

    for (let candidate = path.length - 1; candidate > anchor + 1; candidate--) {
      if (hasLineOfSight(grid, path[anchor], path[candidate])) {
        farthest = candidate;
        break;
      }
    }

    pulled.push(path[farthest]);
    anchor = farthest;
  }

  return pulled;
}

function hasLineOfSight(grid: Grid, from: Point, to: Point): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 8;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(from.x + dx * t);
    const y = Math.round(from.y + dy * t);
    if (!grid.walkable(x, y)) return false;
  }

  return true;
}

/**
 * Comando `d` di un path SVG che segue i punti raccordando gli angoli con
 * curve quadratiche di raggio `radius`.
 */
export function roundedPathD(points: Point[], radius: number): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${f(points[0].x)} ${f(points[0].y)}`;

  let d = `M ${f(points[0].x)} ${f(points[0].y)}`;

  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const r = Math.min(radius, distance(previous, corner) / 2, distance(corner, next) / 2);
    const enter = along(corner, previous, r);
    const exit = along(corner, next, r);

    d += ` L ${f(enter.x)} ${f(enter.y)} Q ${f(corner.x)} ${f(corner.y)} ${f(exit.x)} ${f(exit.y)}`;
  }

  const last = points[points.length - 1];
  return `${d} L ${f(last.x)} ${f(last.y)}`;
}

function along(from: Point, towards: Point, length: number): Point {
  const d = distance(from, towards);
  if (d === 0) return { ...from };
  return {
    x: from.x + ((towards.x - from.x) / d) * length,
    y: from.y + ((towards.y - from.y) / d) * length,
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function f(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Spezza il tracciato in tratte, una per tappa piu' quella finale verso le
 * casse. Serve perche' lo string-pulling va applicato tratta per tratta: sul
 * percorso intero taglierebbe via le discese in corsia.
 *
 * L'indice della tratta corrisponde sempre all'indice della tappa, anche
 * quando una tappa non compare nel tracciato: chi legge `legs[i]` sa di avere
 * fra le mani la tratta di `stops[i]` e non quella di un'altra.
 *
 * Una tappa sulla stessa cella della precedente (piu' prodotti sullo stesso
 * scaffale) da' una tratta di un punto solo: non ci si sposta.
 */
export function splitLegs(path: Point[], stops: Point[]): Point[][] {
  if (path.length === 0) return [];

  const legs: Point[][] = [];
  let anchor = 0;

  for (const stop of stops) {
    if (path[anchor].x === stop.x && path[anchor].y === stop.y) {
      legs.push([path[anchor]]);
      continue;
    }

    let index = -1;
    for (let i = anchor + 1; i < path.length; i++) {
      if (path[i].x === stop.x && path[i].y === stop.y) {
        index = i;
        break;
      }
    }

    if (index === -1) {
      // Tappa fuori dal tracciato: tratta vuota, ma il posto resta occupato.
      legs.push([]);
      continue;
    }

    legs.push(path.slice(anchor, index + 1));
    anchor = index;
  }

  legs.push(path.slice(anchor));
  return legs;
}
