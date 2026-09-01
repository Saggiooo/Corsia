"use client";

import { useState, type ReactNode } from "react";
import { StoreMap, type MapFixture, type MapLabel } from "./StoreMap";

export type PickableLocation = {
  id: string;
  label: string;
  accessX: number;
  accessY: number;
};

export type PickerMap = {
  grid: string[];
  fixtures: MapFixture[];
  entrance: [number, number];
  checkout: [number, number];
  labels: MapLabel[];
};

/** Quanto lontano puo' cadere il dito dal punto di prelievo, in celle. */
const TOLERANCE = 4;

type Props = {
  map: PickerMap;
  locations: PickableLocation[];
  title: string;
  subtitle: string;
  confirmLabel: string;
  initialId?: string | null;
  /** Campo aggiuntivo mostrato sopra il pulsante di conferma. */
  children?: ReactNode;
  /** Permette di confermare anche senza aver scelto un punto. */
  allowEmpty?: boolean;
  onCancel: () => void;
  onConfirm: (location: PickableLocation | null) => void;
};

/**
 * Scelta di un punto di prelievo toccando la mappa. Stesso gesto ovunque si
 * debba dire "sta qui": durante la spesa e nell'area di amministrazione.
 */
export function LocationPicker({
  map,
  locations,
  title,
  subtitle,
  confirmLabel,
  initialId,
  children,
  allowEmpty = false,
  onCancel,
  onConfirm,
}: Props) {
  const [chosen, setChosen] = useState<PickableLocation | null>(
    () => locations.find((l) => l.id === initialId) ?? null,
  );

  const pick = (x: number, y: number) => {
    let best: PickableLocation | null = null;
    let bestDistance = Infinity;

    for (const location of locations) {
      const distance = Math.abs(location.accessX - x) + Math.abs(location.accessY - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = location;
      }
    }

    if (best && bestDistance <= TOLERANCE) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(8);
      setChosen(best);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-paper)]">
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="tag text-[var(--color-ink-3)]">{title}</p>
          <p className="font-display truncate text-xl leading-tight">{subtitle}</p>
          <p className="mt-1 text-sm text-[var(--color-ink-3)]">Tocca il punto giusto sulla mappa.</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full border border-[var(--color-line)] px-4 py-1.5 text-sm"
        >
          Annulla
        </button>
      </div>

      <StoreMap
        grid={map.grid}
        fixtures={map.fixtures}
        entrance={map.entrance}
        checkout={map.checkout}
        labels={map.labels}
        stops={chosen ? [{ x: chosen.accessX, y: chosen.accessY, index: 0 }] : []}
        activeIndex={0}
        targetCell={chosen ? { x: chosen.accessX, y: chosen.accessY } : undefined}
        interactive
        onPickCell={pick}
        className="min-h-0 flex-1"
      />

      <div className="px-5" style={{ paddingBottom: "calc(2rem + var(--safe-b))" }}>
        <div className="plate mb-3 p-4">
          <p className="tag text-[var(--color-ink-3)]">Posizione scelta</p>
          <p className="font-display mt-1 text-lg">{chosen ? chosen.label : "Nessun punto selezionato"}</p>
        </div>

        {children}

        <button
          type="button"
          onClick={() => onConfirm(chosen)}
          disabled={!chosen && !allowEmpty}
          className="font-display w-full rounded-full bg-[var(--color-brand)] py-4 text-lg text-[var(--color-paper)] disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
