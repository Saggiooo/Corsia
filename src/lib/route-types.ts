/** Snapshot di una tappa, congelato dentro Route: resta valido anche se la mappa cambia. */
export type StopSnapshot = {
  itemId: string;
  productId: string | null;
  name: string;
  /** Nota personale scritta sulla riga di lista, es. "Barilla mezzo kg". */
  note: string | null;
  qty: number;
  unit: string | null;
  size: string | null;
  iconKey: string | null;
  categoryIcon: string;
  categoryName: string;
  colorToken: string;
  aisleName: string;
  aisleNumber: number;
  locationLabel: string;
  confirmed: boolean;
  x: number;
  y: number;
};

/** Prodotti che non e' stato possibile inserire nel percorso. */
export type OrphanSnapshot = {
  itemId: string;
  name: string;
  note: string | null;
  qty: number;
  unit: string | null;
  reason: "senza-posizione" | "irraggiungibile";
};

export type RouteSnapshot = {
  stops: StopSnapshot[];
  orphans: OrphanSnapshot[];
};
