"use client";

import { useMemo, useState, useTransition } from "react";
import { moveCategory, moveProducts } from "@/app/actions";
import { ProductAvatar } from "@/components/ui/ProductAvatar";

export type AdminProduct = {
  id: string;
  name: string;
  size: string | null;
  iconKey: string | null;
  categoryIcon: string;
  colorToken: string;
  locationId: string | null;
  locationLabel: string | null;
  confirmed: boolean;
};

export type AdminLocation = { id: string; label: string; aisleName: string };

type Props = {
  storeId: string;
  storeName: string;
  categorySlug: string;
  products: AdminProduct[];
  locations: AdminLocation[];
};

export function PositionsEditor({ storeId, storeName, categorySlug, products, locations }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byAisle = useMemo(() => {
    const map = new Map<string, AdminLocation[]>();
    for (const location of locations) {
      map.set(location.aisleName, [...(map.get(location.aisleName) ?? []), location]);
    }
    return [...map.entries()];
  }, [locations]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const targetLabel = locations.find((l) => l.id === target)?.label ?? "";

  const applyToSelection = () =>
    startTransition(async () => {
      await moveProducts([...selected], storeId, target);
      setDone(`${selected.size} prodotti spostati in ${targetLabel}.`);
      setSelected(new Set());
    });

  const applyToCategory = () =>
    startTransition(async () => {
      await moveCategory(categorySlug, storeId, target);
      setDone(`Tutto il reparto spostato in ${targetLabel}.`);
      setSelected(new Set());
    });

  return (
    <>
      <ul className="mt-4 space-y-2 pb-56">
        {products.map((product) => {
          const active = selected.has(product.id);
          return (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => toggle(product.id)}
                className="plate flex w-full items-center gap-3 p-3 text-left transition-transform active:scale-[0.99]"
                style={active ? { borderColor: "var(--color-ink)" } : undefined}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border text-xs"
                  style={
                    active
                      ? { background: "var(--color-ink)", borderColor: "var(--color-ink)", color: "var(--color-paper)" }
                      : { borderColor: "var(--color-line)" }
                  }
                >
                  {active ? "✓" : ""}
                </span>

                <ProductAvatar
                  iconKey={product.iconKey}
                  fallback={product.categoryIcon}
                  colorToken={product.colorToken}
                  size="sm"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{product.name}</span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-ink-3)]">
                    {product.locationLabel ?? "senza posizione"}
                    {!product.confirmed && product.locationId && (
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]"
                        title="Posizione ipotizzata"
                      />
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-[var(--color-line)] bg-[var(--color-paper)] px-5 pt-3"
        style={{ paddingBottom: "calc(1rem + var(--safe-b))" }}
      >
        {done && <p className="mb-2 text-sm text-[var(--color-brand)]">{done}</p>}

        <label className="block">
          <span className="tag text-[var(--color-ink-3)]">Nuova posizione in {storeName}</span>
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setDone(null);
            }}
            className="mt-1.5 w-full rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-3 text-sm outline-none"
          >
            <option value="">Scegli corsia e scaffale…</option>
            {byAisle.map(([aisle, list]) => (
              <optgroup key={aisle} label={aisle}>
                {list.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            disabled={pending || !target || selected.size === 0}
            onClick={applyToSelection}
            className="font-display flex-1 rounded-full bg-[var(--color-ink)] py-3.5 text-[var(--color-paper)] disabled:opacity-40"
          >
            Sposta {selected.size || ""}
          </button>
          <button
            type="button"
            disabled={pending || !target}
            onClick={applyToCategory}
            className="rounded-full border border-[var(--color-line)] px-4 py-3.5 text-sm disabled:opacity-40"
          >
            Tutto il reparto
          </button>
        </div>
      </div>
    </>
  );
}
