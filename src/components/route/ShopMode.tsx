"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { createReport, finishShopping, movePlacement, toggleChecked } from "@/app/actions";
import { Icon } from "@/components/icons/Icon";
import { LocationPicker } from "@/components/map/LocationPicker";
import { StoreMap, type Focus, type MapFixture, type MapLabel } from "@/components/map/StoreMap";
import { splitLegs } from "@/lib/map/trace";
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
  storeId: string;
  /** Gli admin spostano il prodotto davvero; i membri mandano una segnalazione. */
  canEdit: boolean;
  stops: StopSnapshot[];
  path: number[][];
  cellSizeCm: number;
  checked: Record<string, boolean>;
  locations: PickLocation[];
  map: {
    width: number;
    height: number;
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

export function ShopMode({
  listId,
  listName,
  storeId,
  canEdit,
  stops,
  path,
  cellSizeCm,
  checked,
  locations,
  map,
}: Props) {
  const [done, setDone] = useState(checked);
  const [index, setIndex] = useState(() => {
    const first = stops.findIndex((s) => !checked[s.itemId]);
    return first === -1 ? Math.max(stops.length - 1, 0) : first;
  });
  const [relocating, setRelocating] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
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

  /**
   * L'app non sa dove sei davvero: sa da dove vieni e dove devi arrivare.
   * La vista ravvicinata inquadra quella tratta, non una posizione.
   */
  const legs = useMemo(() => {
    const cells = path.map(([x, y]) => ({ x, y }));
    return splitLegs(
      cells,
      stops.map((s) => ({ x: s.x, y: s.y })),
    );
  }, [path, stops]);

  const leg = legs[index] ?? [];

  /** Piu' prodotti sullo stesso scaffale: non ci si sposta. */
  const samePlace = leg.length <= 1;

  /**
   * Restando fermi la visuale non deve cambiare: si tiene inquadrata l'ultima
   * tratta percorsa davvero, invece di saltare altrove.
   */
  const framedLeg = useMemo(() => {
    for (let i = index; i >= 0; i--) {
      if ((legs[i]?.length ?? 0) > 1) return legs[i];
    }
    return leg;
  }, [legs, index, leg]);

  const focus = useMemo<Focus | undefined>(() => {
    if (framedLeg.length === 0) return undefined;

    const xs = framedLeg.map((p) => p.x);
    const ys = framedLeg.map((p) => p.y);
    const margin = 3;

    let x0 = Math.min(...xs) - margin;
    let y0 = Math.min(...ys) - margin;
    let x1 = Math.max(...xs) + 1 + margin;
    let y1 = Math.max(...ys) + 1 + margin;

    // Sotto una certa ampiezza lo zoom diventa disorientante: si allarga.
    const MIN = 16;
    const grow = (a: number, b: number) => {
      const missing = MIN - (b - a);
      return missing > 0 ? [a - missing / 2, b + missing / 2] : [a, b];
    };

    [x0, x1] = grow(x0, x1);
    [y0, y1] = grow(y0, y1);

    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }, [framedLeg]);

  const legMeters = Math.round((Math.max(leg.length - 1, 0) * cellSizeCm) / 100);

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

  const confirmMove = (location: PickLocation | null) => {
    if (!stop?.productId) return;
    const productId = stop.productId;

    buzz([10, 40, 10]);
    setRelocating(false);

    if (canEdit) {
      if (!location) return;
      startTransition(() => movePlacement(productId, location.id));
      return;
    }

    const note = message;
    setMessage("");
    setSent(true);
    startTransition(() =>
      createReport({
        productId,
        storeId,
        suggestedLocationId: location?.id ?? null,
        message: note,
      }),
    );
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
      <section key={stop.itemId} className="flex-1 px-6 pt-7 pb-44" style={{ animation: "rise .35s both" }}>
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
          {stop.note ? (
            <p className="font-display mt-1 text-xl leading-tight text-[var(--color-signal)]">{stop.note}</p>
          ) : null}
          <p className="mt-1 text-[var(--color-ink-3)]">
            {stop.categoryName}
            {stop.qty > 1 ? ` · ${stop.qty} pezzi` : ""}
          </p>
        </div>

        <div className="plate mt-7 overflow-hidden">
          <div className="flex items-baseline justify-between px-4 pt-3">
            <p className="tag text-[var(--color-ink-3)]">
              {samePlace ? "Stesso scaffale di prima" : "Da qui allo scaffale"}
            </p>
            <p
              className="font-display text-sm"
              style={{ color: samePlace ? "var(--color-ink-3)" : "var(--color-leg)" }}
            >
              {legMeters} m
            </p>
          </div>
          <div className="h-52 p-1">
            <StoreMap
              grid={map.grid}
              fixtures={map.fixtures}
              entrance={map.entrance}
              checkout={map.checkout}
              labels={map.labels}
              path={path}
              legPath={samePlace ? undefined : leg.map((p) => [p.x, p.y])}
              stops={mapStops}
              activeIndex={index}
              focus={focus}
              targetCell={{ x: stop.x, y: stop.y }}
              className="h-full w-full"
            />
          </div>
        </div>

        <div className="plate mt-3 overflow-hidden">
          <p className="tag px-4 pt-3 text-[var(--color-ink-3)]">Tutto il percorso</p>
          <div className="p-1">
            <StoreMap
              aspect={map.width / map.height}
              maxHeightPx={240}
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
        </div>
      </section>

      {/* Comandi */}
      {/* La sfumatura si esaurisce prima dei comandi: sotto ai tasti serve carta piena. */}
      <footer
        className="sticky bottom-0 mt-auto px-5 pt-10"
        style={{
          paddingBottom: "calc(1rem + var(--safe-b))",
          background:
            "linear-gradient(to top, var(--color-paper) 86%, color-mix(in srgb, var(--color-paper) 70%, transparent) 95%, transparent)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            aria-label="Tappa precedente"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-lg disabled:opacity-40"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Salta questa tappa"
            onClick={advance}
            disabled={index >= stops.length - 1}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-lg disabled:opacity-40"
          >
            ›
          </button>

          <button
            type="button"
            onClick={() => {
              setSent(false);
              setRelocating(true);
            }}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3.5 py-2.5 text-sm text-[var(--color-signal)]"
          >
            <Icon name="flag" size={16} />
            {sent ? "Segnalato" : "Non è qui"}
          </button>

          {/* La spesa resta dov'e': quello che hai preso e' gia' salvato. */}
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-[var(--color-line)] px-3.5 py-2.5 text-sm text-[var(--color-ink-2)]"
          >
            <Icon name="exit" size={16} />
            Esci
          </Link>
        </div>

        {done[stop.itemId] ? (
          <button
            type="button"
            onClick={undo}
            className="font-display flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--color-brand)] py-4 text-lg text-[var(--color-brand)]"
          >
            <Icon name="check" size={20} />
            Preso! — annulla
          </button>
        ) : (
          <button
            type="button"
            onClick={take}
            className="font-display flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-ink)] py-4 text-lg text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.97]"
          >
            <Icon name="check" size={20} />
            Preso!
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

      {/* Riposizionamento: stesso gesto dell'area di amministrazione. */}
      {relocating && (
        <LocationPicker
          map={map}
          locations={locations}
          title={canEdit ? "Dove hai trovato" : "Segnala la posizione di"}
          subtitle={stop.name}
          confirmLabel={canEdit ? "Conferma posizione" : "Invia segnalazione"}
          allowEmpty={!canEdit}
          onCancel={() => setRelocating(false)}
          onConfirm={(location) => confirmMove(location as PickLocation | null)}
        >
          {!canEdit && (
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Dettagli, facoltativi"
              className="mb-3 w-full rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-3 text-sm outline-none placeholder:text-[var(--color-ink-3)]"
            />
          )}
        </LocationPicker>
      )}

    </div>
  );
}
