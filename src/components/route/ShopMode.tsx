"use client";

import { useMemo, useState, useTransition } from "react";
import { finishShopping, movePlacement, toggleChecked } from "@/app/actions";
import { StoreMap, type MapFixture, type MapLabel } from "@/components/map/StoreMap";
import { ProductAvatar } from "@/components/ui/ProductAvatar";
import type { StopSnapshot } from "@/lib/route-types";

export type PickLocation = {
  id: string;
  aisleName: string;
  label: string;
  accessX: number;
  accessY: number;
};

type Props = {
  listId: string;
  listName: string;
  stops: StopSnapshot[];
  path: number[][];
  checked: Record<string, boolean>;
  locations: PickLocation[];
  map: {
    grid: string[];
    fixtures: MapFixture[];
    entrance: [number, number];
    checkout: [number, number];
    labels: MapLabel[];
  };
};

function buzz(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

/**
 * Targa della tappa. Le corsie numerate mostrano il numero gigante, come i
 * cartelli appesi in negozio; i reparti mostrano il nome, rimpicciolito quanto
 * serve perche' ci stia.
 */
function signOf(aisleName: string): { kicker: string; value: string; size: string } {
  const numbered = aisleName.match(/^Corsia\s+(\d+)$/i);
  if (numbered) return { kicker: "Corsia", value: numbered[1], size: "clamp(4.5rem,26vw,8rem)" };

  const size =
    aisleName.length > 9 ? "clamp(2rem,9.5vw,3rem)" : "clamp(2.5rem,12vw,3.75rem)";
  return { kicker: "Reparto", value: aisleName, size };
}

export function ShopMode({ listId, listName, stops, path, checked, locations, map }: Props) {
  const [done, setDone] = useState(checked);
  const [index, setIndex] = useState(() => {
    const first = stops.findIndex((s) => !checked[s.itemId]);
    return first === -1 ? Math.max(stops.length - 1, 0) : first;
  });
  const [relocating, setRelocating] = useState(false);
  const [candidate, setCandidate] = useState<PickLocation | null>(null);
  const [, startTransition] = useTransition();

  const stop = stops[index];
  const sign = signOf(stop?.aisleName ?? "");
  const doneCount = stops.filter((s) => done[s.itemId]).length;
  const progress = stops.length === 0 ? 100 : Math.round((doneCount / stops.length) * 100);
  const complete = doneCount === stops.length;

  const mapStops = useMemo(
    () => stops.map((s, i) => ({ x: s.x, y: s.y, index: i, done: done[s.itemId] })),
    [stops, done],
  );

  const advance = () => setIndex((i) => Math.min(i + 1, stops.length - 1));

  const take = () => {
    if (!stop) return;
    buzz(14);
    setDone((d) => ({ ...d, [stop.itemId]: true }));
    startTransition(() => toggleChecked(stop.itemId, true));

    const next = stops.findIndex((s, i) => i > index && !done[s.itemId]);
    setIndex(next === -1 ? index : next);
  };

  const undo = () => {
    if (!stop) return;
    setDone((d) => ({ ...d, [stop.itemId]: false }));
    startTransition(() => toggleChecked(stop.itemId, false));
  };

  const pickCell = (x: number, y: number) => {
    let best: PickLocation | null = null;
    let bestDistance = Infinity;

    for (const location of locations) {
      const distance = Math.abs(location.accessX - x) + Math.abs(location.accessY - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = location;
      }
    }

    if (best && bestDistance <= 4) {
      buzz(8);
      setCandidate(best);
    }
  };

  const confirmMove = () => {
    if (!candidate || !stop?.productId) return;
    const productId = stop.productId;
    const locationId = candidate.id;
    buzz([10, 40, 10]);
    setRelocating(false);
    setCandidate(null);
    startTransition(() => movePlacement(productId, locationId));
  };

  if (!stop) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <p className="font-display text-2xl">Niente da prendere</p>
        <form action={finishShopping.bind(null, listId)}>
          <button className="rounded-full bg-[var(--color-ink)] px-6 py-3 text-[var(--color-paper)]">
            Chiudi la lista
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Testata: avanzamento */}
      <header className="px-5 pt-4">
        <div className="flex items-center justify-between text-[var(--color-ink-3)]">
          <span className="tag">{listName}</span>
          <span className="tag">
            {doneCount} / {stops.length}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-paper-3)]">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: complete ? "var(--color-brand)" : "var(--color-signal)",
            }}
          />
        </div>
      </header>

      {/* Tappa corrente */}
      <section key={stop.itemId} className="flex-1 px-6 pt-7" style={{ animation: "rise .35s both" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="tag text-[var(--color-ink-3)]">
              Tappa {index + 1} · {sign.kicker}
            </p>
            <p
              className="font-display mt-1 leading-[0.85] tracking-[-0.04em] break-words"
              style={{ color: `var(--${stop.colorToken})`, fontSize: sign.size }}
            >
              {sign.value}
            </p>
            <p className="mt-2 text-sm text-[var(--color-ink-2)]">{stop.locationLabel}</p>
          </div>
          <ProductAvatar
            iconKey={stop.iconKey}
            fallback={stop.categoryIcon}
            colorToken={stop.colorToken}
            size="xl"
            className="shrink-0"
          />
        </div>

        <div className="mt-8">
          <h1 className="font-display text-3xl leading-tight">{stop.name}</h1>
          <p className="mt-1 text-[var(--color-ink-3)]">
            {stop.size ?? stop.categoryName}
            {stop.qty > 1 ? ` · ${stop.qty} pezzi` : ""}
          </p>
          {!stop.confirmed && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-signal-soft)] px-3 py-1.5 text-xs text-[var(--color-signal)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]" />
              Posizione ipotizzata
            </p>
          )}
        </div>

        <div className="plate mt-7 h-48 overflow-hidden p-1">
          <StoreMap
            grid={map.grid}
            fixtures={map.fixtures}
            entrance={map.entrance}
            checkout={map.checkout}
            path={path}
            stops={mapStops}
            activeIndex={index}
            className="h-full w-full"
          />
        </div>
      </section>

      {/* Comandi */}
      <footer
        className="sticky bottom-0 mt-auto bg-gradient-to-t from-[var(--color-paper)] via-[var(--color-paper)] to-transparent px-5 pt-6"
        style={{ paddingBottom: "calc(1rem + var(--safe-b))" }}
      >
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm disabled:opacity-40"
          >
            ‹ Prima
          </button>
          <button
            type="button"
            onClick={advance}
            disabled={index >= stops.length - 1}
            className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Salta ›
          </button>
          <button
            type="button"
            onClick={() => setRelocating(true)}
            className="ml-auto rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm text-[var(--color-signal)]"
          >
            Non è qui
          </button>
        </div>

        {done[stop.itemId] ? (
          <button
            type="button"
            onClick={undo}
            className="font-display w-full rounded-full border-2 border-[var(--color-brand)] py-4 text-lg text-[var(--color-brand)]"
          >
            Preso ✓ — annulla
          </button>
        ) : (
          <button
            type="button"
            onClick={take}
            className="font-display w-full rounded-full bg-[var(--color-ink)] py-4 text-lg text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.97]"
          >
            Preso
          </button>
        )}

        {complete && (
          <form action={finishShopping.bind(null, listId)} className="mt-2">
            <button className="font-display w-full rounded-full bg-[var(--color-brand)] py-4 text-lg text-[var(--color-paper)]">
              Concludi la spesa
            </button>
          </form>
        )}
      </footer>

      {/* Riposizionamento */}
      {relocating && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-paper)]">
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              <p className="tag text-[var(--color-ink-3)]">Dove hai trovato</p>
              <p className="font-display text-xl leading-tight">{stop.name}</p>
              <p className="mt-1 text-sm text-[var(--color-ink-3)]">
                Tocca il punto giusto sulla mappa.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setRelocating(false);
                setCandidate(null);
              }}
              className="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-sm"
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
            stops={candidate ? [{ x: candidate.accessX, y: candidate.accessY, index: 0 }] : []}
            activeIndex={0}
            interactive
            onPickCell={pickCell}
            className="min-h-0 flex-1"
          />

          <div className="px-5 pb-8" style={{ paddingBottom: "calc(2rem + var(--safe-b))" }}>
            <div className="plate mb-3 p-4">
              <p className="tag text-[var(--color-ink-3)]">Nuova posizione</p>
              <p className="font-display mt-1 text-lg">
                {candidate ? candidate.label : "Nessun punto selezionato"}
              </p>
            </div>
            <button
              type="button"
              onClick={confirmMove}
              disabled={!candidate}
              className="font-display w-full rounded-full bg-[var(--color-brand)] py-4 text-lg text-[var(--color-paper)] disabled:opacity-40"
            >
              Conferma posizione
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
