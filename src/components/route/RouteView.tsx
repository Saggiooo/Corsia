"use client";

import { useState, useTransition } from "react";
import { computeRoute, startShopping } from "@/app/actions";
import { StoreMap, type MapFixture, type MapLabel } from "@/components/map/StoreMap";
import { AisleBadge } from "@/components/ui/AisleBadge";
import { ProductAvatar } from "@/components/ui/ProductAvatar";
import type { RouteSnapshot } from "@/lib/route-types";

type Props = {
  listId: string;
  mode: "shortest" | "coldchain";
  distanceM: number;
  estMinutes: number;
  snapshot: RouteSnapshot;
  path: number[][];
  map: { grid: string[]; fixtures: MapFixture[]; entrance: [number, number]; checkout: [number, number]; labels: MapLabel[] };
};

export function RouteView({ listId, mode, distanceM, estMinutes, snapshot, path, map }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const stops = snapshot.stops;
  const mapStops = stops.map((stop, index) => ({ x: stop.x, y: stop.y, index }));

  // Tappe consecutive nella stessa corsia diventano un unico blocco.
  const blocks: { aisle: string; items: typeof stops; from: number }[] = [];
  stops.forEach((stop, index) => {
    const last = blocks.at(-1);
    if (last && last.aisle === stop.aisleName) last.items.push(stop);
    else blocks.push({ aisle: stop.aisleName, items: [stop], from: index });
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="plate grain relative mt-4 block w-full overflow-hidden p-0"
        aria-label="Apri la mappa a schermo intero"
      >
        <div className="h-64 w-full">
          <StoreMap
            grid={map.grid}
            fixtures={map.fixtures}
            entrance={map.entrance}
            checkout={map.checkout}
            labels={map.labels}
            path={path}
            stops={mapStops}
            className="h-full w-full"
          />
        </div>
        <span className="absolute right-3 bottom-3 rounded-full bg-[var(--color-ink)]/85 px-3 py-1.5 text-[11px] text-[var(--color-paper)] backdrop-blur">
          Ingrandisci
        </span>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Tappe", value: String(stops.length) },
          { label: "Metri", value: String(distanceM) },
          { label: "Minuti", value: `~${estMinutes}` },
        ].map((stat) => (
          <div key={stat.label} className="plate px-3 py-3 text-center">
            <p className="font-display text-2xl leading-none">{stat.value}</p>
            <p className="tag mt-1.5 text-[var(--color-ink-3)]">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] p-1 text-sm">
        {(
          [
            { key: "coldchain", label: "Rispetta il freddo" },
            { key: "shortest", label: "Più corto" },
          ] as const
        ).map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => computeRoute(listId, option.key))}
            className={`flex-1 rounded-full px-3 py-2 transition-colors ${
              mode === option.key
                ? "bg-[var(--color-ink)] text-[var(--color-paper)]"
                : "text-[var(--color-ink-2)]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <ol className="mt-6 space-y-5 pb-32">
        {blocks.map((block, blockIndex) => (
          <li key={`${block.aisle}-${block.from}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-display flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--color-ink)] px-2 text-sm text-[var(--color-paper)]">
                {block.from + 1}
                {block.items.length > 1 ? `–${block.from + block.items.length}` : ""}
              </span>
              <h3 className="font-display text-base">{block.aisle}</h3>
              <span className="h-px flex-1 bg-[var(--color-line)]" />
            </div>

            <ul className="space-y-2">
              {block.items.map((stop, i) => (
                <li
                  key={stop.itemId}
                  className="plate flex items-center gap-3 p-3"
                  style={{ animation: `rise .32s ${Math.min(blockIndex * 3 + i, 14) * 30}ms both` }}
                >
                  <ProductAvatar
                    iconKey={stop.iconKey}
                    fallback={stop.categoryIcon}
                    colorToken={stop.colorToken}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{stop.name}</p>
                    {stop.note ? (
                      <p className="truncate text-[13px] text-[var(--color-signal)]">{stop.note}</p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-[var(--color-ink-3)]">
                      {stop.locationLabel}
                      {stop.size ? ` · ${stop.size}` : ""}
                    </p>
                  </div>
                  {stop.qty > 1 && (
                    <span className="font-display rounded-full bg-[var(--color-paper-2)] px-2.5 py-1 text-sm">
                      ×{stop.qty}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}

        {snapshot.orphans.length > 0 && (
          <li>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-display flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-signal-soft)] text-sm text-[var(--color-signal)]">
                ?
              </span>
              <h3 className="font-display text-base">Senza corsia</h3>
              <span className="h-px flex-1 bg-[var(--color-line)]" />
            </div>
            <ul className="space-y-2">
              {snapshot.orphans.map((orphan) => (
                <li key={orphan.itemId} className="plate flex items-center gap-3 p-3">
                  <ProductAvatar iconKey="basket" colorToken="pantry" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{orphan.name}</p>
                    {orphan.note ? (
                      <p className="truncate text-[13px] text-[var(--color-signal)]">{orphan.note}</p>
                    ) : null}
                    <p className="tag mt-0.5 text-[var(--color-ink-3)]">
                      {orphan.reason === "irraggiungibile" ? "Non raggiungibile sulla mappa" : "Posizione sconosciuta"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ol>

      <div
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-5"
        style={{ paddingBottom: "calc(1.25rem + var(--safe-b))" }}
      >
        <form action={startShopping.bind(null, listId)}>
          <button
            type="submit"
            className="font-display w-full rounded-full bg-[var(--color-signal)] py-4 text-lg text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.98]"
          >
            Inizia la spesa
          </button>
        </form>
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-paper)]">
          <div className="flex items-center justify-between px-5 py-4">
            <p className="font-display text-lg">Mappa del percorso</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-full border border-[var(--color-line)] px-4 py-1.5 text-sm"
            >
              Chiudi
            </button>
          </div>
          <StoreMap
            grid={map.grid}
            fixtures={map.fixtures}
            entrance={map.entrance}
            checkout={map.checkout}
            labels={map.labels}
            path={path}
            stops={mapStops}
            interactive
            className="min-h-0 flex-1"
          />
        </div>
      )}
    </>
  );
}
