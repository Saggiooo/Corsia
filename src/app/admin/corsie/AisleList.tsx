"use client";

import { useState, useTransition } from "react";
import { renameAisle } from "@/app/actions";

export type AisleRow = {
  id: string;
  number: number;
  name: string;
  sequence: number;
  locations: number;
  vertical: boolean;
};

export function AisleList({ aisles }: { aisles: AisleRow[] }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Record<string, { name: string; sequence: number }>>(
    () => Object.fromEntries(aisles.map((a) => [a.id, { name: a.name, sequence: a.sequence }])),
  );

  const save = (id: string) => {
    const value = draft[id];
    startTransition(() => renameAisle(id, value.name, value.sequence));
  };

  return (
    <ul className="mt-5 space-y-2.5">
      {aisles.map((aisle) => (
        <li key={aisle.id} className="plate p-3.5">
          <div className="flex items-center gap-3">
            <label className="shrink-0">
              <span className="sr-only">Ordine di percorrenza</span>
              <input
                type="number"
                min={1}
                value={draft[aisle.id].sequence}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    [aisle.id]: { ...d[aisle.id], sequence: Number(e.target.value) || 1 },
                  }))
                }
                onBlur={() => save(aisle.id)}
                className="font-display h-11 w-12 rounded-[12px] bg-[var(--color-paper-2)] text-center text-lg outline-none"
              />
            </label>

            <label className="min-w-0 flex-1">
              <span className="sr-only">Nome della corsia</span>
              <input
                value={draft[aisle.id].name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [aisle.id]: { ...d[aisle.id], name: e.target.value } }))
                }
                onBlur={() => save(aisle.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-full bg-transparent font-medium outline-none focus:underline focus:decoration-[var(--color-signal)] focus:underline-offset-4"
              />
              <span className="tag text-[var(--color-ink-3)]">
                {aisle.locations} punti · {aisle.vertical ? "verticale" : "orizzontale"}
              </span>
            </label>
          </div>
        </li>
      ))}

      {pending && <li className="text-center text-xs text-[var(--color-ink-3)]">Salvo…</li>}
    </ul>
  );
}
