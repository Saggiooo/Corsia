/**
 * Planimetria di partenza per Extracoop Villanova.
 *
 * Non e' un rilievo del negozio reale: e' un ipermercato plausibile pensato per
 * essere corretto dall'editor mappa dell'app. Griglia a celle da 50 cm,
 * 60 x 40 celle = 30 m x 20 m.
 */

export type Cell = [number, number];

export type LayoutFixture = {
  key: string;
  kind: "shelf" | "counter" | "fridge" | "freezer" | "checkout" | "entrance" | "wall" | "promo";
  label?: string;
  aisleNumber?: number;
  colorToken?: string;
  cells: Cell[];
};

export type LayoutAisle = {
  number: number;
  name: string;
  sequence: number;
  vertical: boolean;
};

export type LayoutLocation = {
  aisleNumber: number;
  side: "L" | "R";
  bay: number;
  accessX: number;
  accessY: number;
  label: string;
  fixtureKey?: string;
};

export type Layout = {
  width: number;
  height: number;
  cellSizeCm: number;
  grid: string[];
  entrance: Cell;
  checkout: Cell;
  aisles: LayoutAisle[];
  fixtures: LayoutFixture[];
  locations: LayoutLocation[];
};

const W = 60;
const H = 40;

/** Blocchi di scaffali verticali: larghi 2 celle, corridoi da 3. */
const SHELF_BLOCKS = 10;
const SHELF_X0 = 3;
const SHELF_STEP = 5;
const SHELF_Y0 = 12;
const SHELF_Y1 = 30;

/** Campate lungo la corsia: y di accesso al centro di ognuna. */
const BAYS = [
  { bay: 1, from: 12, to: 16, access: 14 },
  { bay: 2, from: 17, to: 21, access: 19 },
  { bay: 3, from: 22, to: 26, access: 24 },
  { bay: 4, from: 27, to: 30, access: 29 },
];

const FRIDGE_X0 = 53;
const FRIDGE_X1 = 54;

const COUNTERS = [
  { key: "ortofrutta", label: "Ortofrutta", x0: 3, x1: 14, color: "produce", bays: 3 },
  { key: "forno", label: "Forno", x0: 17, x1: 26, color: "bakery", bays: 2 },
  { key: "macelleria", label: "Macelleria", x0: 29, x1: 40, color: "meat", bays: 2 },
  { key: "pescheria", label: "Pescheria", x0: 43, x1: 54, color: "fish", bays: 2 },
];
const COUNTER_Y0 = 4;
const COUNTER_Y1 = 8;
const COUNTER_ACCESS_Y = 9;

const FREEZERS = [
  { key: "surgelati-1", x0: 3, x1: 10 },
  { key: "surgelati-2", x0: 13, x1: 20 },
  { key: "surgelati-3", x0: 23, x1: 30 },
];
const FREEZER_Y0 = 34;
const FREEZER_Y1 = 36;
const FREEZER_ACCESS_Y = 33;

const CHECKOUT_X = [36, 41, 46, 51];
const CHECKOUT_Y0 = 34;
const CHECKOUT_Y1 = 36;

export function buildLayout(): Layout {
  const rows: string[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? "#" : ".")),
  );

  const fixtures: LayoutFixture[] = [];
  const aisles: LayoutAisle[] = [];
  const locations: LayoutLocation[] = [];

  const block = (key: string, kind: LayoutFixture["kind"], label: string | undefined, cells: Cell[], color?: string) => {
    for (const [x, y] of cells) rows[y][x] = "#";
    fixtures.push({ key, kind, label, cells, colorToken: color });
  };

  const rect = (x0: number, x1: number, y0: number, y1: number): Cell[] => {
    const cells: Cell[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push([x, y]);
    return cells;
  };

  let sequence = 1;

  // --- Banchi serviti in alto ------------------------------------------
  for (const counter of COUNTERS) {
    const number = 100 + COUNTERS.indexOf(counter);
    block(counter.key, "counter", counter.label, rect(counter.x0, counter.x1, COUNTER_Y0, COUNTER_Y1), counter.color);
    aisles.push({ number, name: counter.label, sequence: sequence++, vertical: false });

    const span = counter.x1 - counter.x0 + 1;
    const width = Math.floor(span / counter.bays);
    for (let bay = 1; bay <= counter.bays; bay++) {
      locations.push({
        aisleNumber: number,
        side: "R",
        bay,
        accessX: counter.x0 + Math.floor(width * (bay - 0.5)),
        accessY: COUNTER_ACCESS_Y,
        label: `${counter.label} · banco ${bay}`,
        fixtureKey: counter.key,
      });
    }
  }

  // --- Corsie centrali ---------------------------------------------------
  for (let i = 0; i < SHELF_BLOCKS; i++) {
    const x0 = SHELF_X0 + i * SHELF_STEP;
    block(`scaffale-${i + 1}`, "shelf", undefined, rect(x0, x0 + 1, SHELF_Y0, SHELF_Y1));
  }
  block("frigo-latticini", "fridge", "Latticini", rect(FRIDGE_X0, FRIDGE_X1, SHELF_Y0, SHELF_Y1), "dairy");

  // Corsia 1: corridoio perimetrale sinistro. Corsie 2..11: fra i blocchi.
  // Corsia 12: corridoio perimetrale destro, lungo i frigo.
  const corridors: { number: number; leftX: number; rightX: number; leftBlock?: string; rightBlock?: string }[] = [
    { number: 1, leftX: 1, rightX: 2, rightBlock: "scaffale-1" },
  ];
  for (let i = 0; i < SHELF_BLOCKS; i++) {
    const from = SHELF_X0 + i * SHELF_STEP + 2;
    corridors.push({
      number: i + 2,
      leftX: from,
      rightX: from + 2,
      leftBlock: `scaffale-${i + 1}`,
      rightBlock: i + 1 < SHELF_BLOCKS ? `scaffale-${i + 2}` : "frigo-latticini",
    });
  }
  corridors.push({ number: 12, leftX: 55, rightX: 58, leftBlock: "frigo-latticini" });

  for (const corridor of corridors) {
    aisles.push({
      number: corridor.number,
      name: `Corsia ${corridor.number}`,
      sequence: sequence++,
      vertical: true,
    });

    for (const bay of BAYS) {
      if (corridor.leftBlock) {
        locations.push({
          aisleNumber: corridor.number,
          side: "L",
          bay: bay.bay,
          accessX: corridor.leftX,
          accessY: bay.access,
          label: `Corsia ${corridor.number} · scaffale ${bay.bay} sx`,
          fixtureKey: corridor.leftBlock,
        });
      }
      if (corridor.rightBlock) {
        locations.push({
          aisleNumber: corridor.number,
          side: "R",
          bay: bay.bay,
          accessX: corridor.rightX,
          accessY: bay.access,
          label: `Corsia ${corridor.number} · scaffale ${bay.bay} dx`,
          fixtureKey: corridor.rightBlock,
        });
      }
    }
  }

  // --- Surgelati in fondo ------------------------------------------------
  const freezerAisle = 200;
  aisles.push({ number: freezerAisle, name: "Surgelati", sequence: sequence++, vertical: false });
  FREEZERS.forEach((freezer, index) => {
    block(freezer.key, "freezer", index === 0 ? "Surgelati" : undefined, rect(freezer.x0, freezer.x1, FREEZER_Y0, FREEZER_Y1), "frozen");
    const mid = Math.floor((freezer.x0 + freezer.x1) / 2);
    locations.push({
      aisleNumber: freezerAisle,
      side: "L",
      bay: index * 2 + 1,
      accessX: freezer.x0 + 1,
      accessY: FREEZER_ACCESS_Y,
      label: `Surgelati · isola ${index + 1} a`,
      fixtureKey: freezer.key,
    });
    locations.push({
      aisleNumber: freezerAisle,
      side: "R",
      bay: index * 2 + 2,
      accessX: mid + 2,
      accessY: FREEZER_ACCESS_Y,
      label: `Surgelati · isola ${index + 1} b`,
      fixtureKey: freezer.key,
    });
  });

  // --- Casse e ingresso ---------------------------------------------------
  CHECKOUT_X.forEach((x, index) => {
    block(`cassa-${index + 1}`, "checkout", index === 0 ? "Casse" : undefined, rect(x, x + 2, CHECKOUT_Y0, CHECKOUT_Y1), "checkout");
  });

  const entrance: Cell = [2, 2];
  const checkout: Cell = [39, 33];
  fixtures.push({ key: "ingresso", kind: "entrance", label: "Ingresso", cells: [entrance] });

  return {
    width: W,
    height: H,
    cellSizeCm: 50,
    grid: rows.map((row) => row.join("")),
    entrance,
    checkout,
    aisles,
    fixtures,
    locations,
  };
}
