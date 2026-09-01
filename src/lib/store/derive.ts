import type { Grid } from "@/lib/routing/grid";

/**
 * Da una planimetria disegnata ricava corsie e punti di prelievo.
 *
 * Regola: ogni blocco su cui si prende merce e' una corsia, e i suoi lati
 * raggiungibili sono gli scaffali di quella corsia. E' il modo in cui una
 * persona indica le cose in negozio ("quel blocco li', lato destro"), e per il
 * calcolo del percorso la corsia serve solo a raggruppare e a dare l'ordine.
 */

export type DerivableFixture = {
  key: string;
  kind: string;
  label?: string | null;
  cells: number[][];
};

export type DerivedAisle = {
  key: string;
  number: number;
  name: string;
  sequence: number;
  vertical: boolean;
};

export type DerivedLocation = {
  aisleKey: string;
  side: "L" | "R";
  bay: number;
  accessX: number;
  accessY: number;
  label: string;
};

/** Blocchi da cui si prende merce. Muri, casse e ingresso non fanno corsia. */
const PICKABLE = new Set(["shelf", "counter", "fridge", "freezer", "promo"]);

/** Lunghezza massima di una campata, in celle (5 celle da 50 cm = 2,5 m). */
const BAY_CELLS = 5;

export function deriveLayout(
  grid: Grid,
  fixtures: DerivableFixture[],
): { aisles: DerivedAisle[]; locations: DerivedLocation[] } {
  const usable = fixtures.filter((f) => PICKABLE.has(f.kind) && f.cells.length > 0);
  if (usable.length === 0) return { aisles: [], locations: [] };

  const described = usable.map((fixture) => {
    const xs = fixture.cells.map(([x]) => x);
    const ys = fixture.cells.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      fixture,
      vertical: maxY - minY >= maxX - minX,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  });

  const ordered = serpentine(described, grid);

  const aisles: DerivedAisle[] = [];
  const locations: DerivedLocation[] = [];

  for (const [index, entry] of ordered.entries()) {
    const own = new Set(entry.fixture.cells.map(([x, y]) => `${x},${y}`));

    const sides: { side: "L" | "R"; dx: number; dy: number }[] = entry.vertical
      ? [
          { side: "L", dx: -1, dy: 0 },
          { side: "R", dx: 1, dy: 0 },
        ]
      : [
          { side: "L", dx: 0, dy: -1 },
          { side: "R", dx: 0, dy: 1 },
        ];

    const found: DerivedLocation[] = [];

    for (const { side, dx, dy } of sides) {
      const face = entry.fixture.cells
        .map(([x, y]) => [x + dx, y + dy] as [number, number])
        .filter(([x, y]) => grid.walkable(x, y) && !own.has(`${x},${y}`));

      let bay = 1;
      for (const run of contiguousRuns(face, entry.vertical)) {
        for (const segment of splitIntoBays(run)) {
          const middle = segment[Math.floor(segment.length / 2)];
          found.push({
            aisleKey: entry.fixture.key,
            side,
            bay: bay++,
            accessX: middle[0],
            accessY: middle[1],
            label: "",
          });
        }
      }
    }

    if (found.length === 0) continue;

    const number = aisles.length + 1;
    const name = entry.fixture.label?.trim() || `Corsia ${number}`;

    aisles.push({
      key: entry.fixture.key,
      number,
      name,
      sequence: index + 1,
      vertical: entry.vertical,
    });

    for (const location of found) {
      locations.push({
        ...location,
        label: `${name} · scaffale ${location.bay} ${location.side === "L" ? "sx" : "dx"}`,
      });
    }
  }

  // La sequenza deve restare progressiva anche dopo aver scartato i blocchi
  // senza lati raggiungibili.
  aisles.forEach((aisle, index) => {
    aisle.sequence = index + 1;
  });

  return { aisles, locations };
}

type Described = { fixture: DerivableFixture; vertical: boolean; centerX: number; centerY: number };

/**
 * Ordine di percorrenza: fasce orizzontali dall'alto in basso, e dentro ogni
 * fascia si alterna il verso. E' il giro che si fa davvero in un negozio.
 */
function serpentine(entries: Described[], grid: Grid): Described[] {
  const bandHeight = Math.max(6, Math.round(grid.h / 4));

  return [...entries].sort((a, b) => {
    const bandA = Math.floor(a.centerY / bandHeight);
    const bandB = Math.floor(b.centerY / bandHeight);
    if (bandA !== bandB) return bandA - bandB;

    const direction = bandA % 2 === 0 ? 1 : -1;
    return (a.centerX - b.centerX) * direction;
  });
}

/** Spezza una faccia nei tratti effettivamente contigui. */
function contiguousRuns(face: [number, number][], vertical: boolean): [number, number][][] {
  if (face.length === 0) return [];

  const sorted = [...face].sort((a, b) => (vertical ? a[1] - b[1] || a[0] - b[0] : a[0] - b[0] || a[1] - b[1]));
  const runs: [number, number][][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const step = vertical ? current[1] - previous[1] : current[0] - previous[0];
    const drift = vertical ? Math.abs(current[0] - previous[0]) : Math.abs(current[1] - previous[1]);

    if (step === 1 && drift === 0) runs[runs.length - 1].push(current);
    else if (step === 0) continue;
    else runs.push([current]);
  }

  return runs;
}

/** Divide un tratto in campate di lunghezza il piu' possibile uniforme. */
function splitIntoBays(run: [number, number][]): [number, number][][] {
  const count = Math.max(1, Math.ceil(run.length / BAY_CELLS));
  const size = Math.ceil(run.length / count);
  const bays: [number, number][][] = [];

  for (let i = 0; i < run.length; i += size) bays.push(run.slice(i, i + size));
  return bays;
}
