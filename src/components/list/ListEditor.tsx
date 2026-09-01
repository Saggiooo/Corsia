"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addFreeText,
  addProduct,
  addSavedProduct,
  removeItem,
  removeSavedProduct,
  routeAndOpen,
  saveProduct,
  setNote,
  setQty,
} from "@/app/actions";
import { Icon } from "@/components/icons/Icon";
import { AisleBadge } from "@/components/ui/AisleBadge";
import { ProductAvatar } from "@/components/ui/ProductAvatar";
import type { SearchHit } from "@/lib/queries";

export type EditorItem = {
  id: string;
  productId: string | null;
  name: string;
  size: string | null;
  note: string | null;
  qty: number;
  iconKey: string | null;
  categoryName: string;
  categoryIcon: string;
  colorToken: string;
  aisleName: string | null;
  locationLabel: string | null;
  confirmed: boolean;
};

export type EditorCategory = { slug: string; name: string; iconKey: string; colorToken: string };

export type FrequentProduct = {
  id: string;
  name: string;
  iconKey: string | null;
  categoryIcon: string;
  colorToken: string;
};

export type SavedEntry = {
  id: string;
  productId: string;
  name: string;
  note: string;
  iconKey: string | null;
  categoryIcon: string;
  colorToken: string;
};

type Props = {
  listId: string;
  items: EditorItem[];
  categories: EditorCategory[];
  frequent: FrequentProduct[];
  saved: SavedEntry[];
};

/** Valore speciale del filtro: mostra i prodotti salvati invece di un reparto. */
const SAVED = "__salvati__";

export function ListEditor({ listId, items, categories, frequent, saved }: Props) {
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  const browsing = query.trim().length >= 2 || category !== null;
  const showingSaved = category === SAVED;

  useEffect(() => {
    if (!browsing || showingSaved) {
      setHits([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = category
          ? `category=${encodeURIComponent(category)}`
          : `q=${encodeURIComponent(query)}`;
        const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
        const data = (await response.json()) as { hits: SearchHit[] };
        setHits(data.hits);
      } catch {
        // richiesta annullata: la sostituisce quella successiva
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, category, browsing, showingSaved]);

  const inList = useMemo(() => new Map(items.map((i) => [i.name, i])), [items]);

  const savedKeys = useMemo(
    () => new Set(saved.map((entry) => `${entry.productId}::${entry.note}`)),
    [saved],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, EditorItem[]>();
    for (const item of items) map.set(item.categoryName, [...(map.get(item.categoryName) ?? []), item]);
    return [...map.entries()];
  }, [items]);

  const total = items.reduce((sum, i) => sum + i.qty, 0);

  const reset = () => {
    setQuery("");
    setCategory(null);
    setHits([]);
  };

  return (
    <>
      <div className="sticky top-0 z-30 -mx-5 bg-[var(--color-paper)]/92 px-5 pt-2 pb-3 backdrop-blur-md">
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-white/70 px-4 py-3 shadow-[var(--shadow-plate)]">
          <Icon name="basket" size={20} className="shrink-0 text-[var(--color-ink-3)]" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCategory(null);
            }}
            placeholder="Cerca un prodotto…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--color-ink-3)]"
            enterKeyHint="done"
          />
          {browsing && (
            <button
              type="button"
              onClick={reset}
              aria-label="Chiudi ricerca"
              className="text-[var(--color-ink-3)]"
            >
              ✕
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5">
          {saved.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCategory(category === SAVED ? null : SAVED);
                setQuery("");
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap"
              style={
                showingSaved
                  ? { background: "var(--color-ink)", borderColor: "transparent", color: "var(--color-paper)" }
                  : {
                      background: "var(--color-paper-2)",
                      borderColor: "var(--color-line)",
                      color: "var(--color-ink-2)",
                    }
              }
            >
              <Icon name="bookmark" size={15} />
              Salvati
            </button>
          )}

          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                setCategory(category === c.slug ? null : c.slug);
                setQuery("");
              }}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
              style={
                category === c.slug
                  ? {
                      background: `var(--${c.colorToken})`,
                      borderColor: "transparent",
                      color: "var(--color-paper)",
                    }
                  : {
                      background: `var(--${c.colorToken}-soft)`,
                      borderColor: "transparent",
                      color: `var(--${c.colorToken})`,
                    }
              }
            >
              <Icon name={c.iconKey} size={15} />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {showingSaved ? (
        <section className="mt-2 pb-28">
          <p className="mb-3 text-sm text-[var(--color-ink-3)]">
            Prodotti messi da parte con la loro nota. Toccali per aggiungerli già personalizzati.
          </p>
          <ul className="space-y-2">
            {saved.map((entry, i) => (
              <li key={entry.id} style={{ animation: `rise .28s ${Math.min(i, 12) * 25}ms both` }}>
                <div className="plate flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await addSavedProduct(listId, entry.id);
                        reset();
                      })
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ProductAvatar
                      iconKey={entry.iconKey}
                      fallback={entry.categoryIcon}
                      colorToken={entry.colorToken}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{entry.name}</span>
                      {entry.note ? (
                        <span className="block truncate text-[13px] text-[var(--color-signal)]">{entry.note}</span>
                      ) : null}
                    </span>
                    <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-paper-2)] text-lg">
                      +
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Togli ${entry.name} dai salvati`}
                    onClick={() => startTransition(() => removeSavedProduct(entry.id))}
                    className="shrink-0 text-[var(--color-ink-3)]"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : browsing ? (
        <section className="mt-2 pb-24">
          {searching && hits.length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-ink-3)]">Cerco…</p>
          )}

          {!searching && hits.length === 0 && query.trim().length >= 2 && (
            <button
              type="button"
              onClick={() =>
                startTransition(async () => {
                  await addFreeText(listId, query);
                  reset();
                })
              }
              className="plate mt-3 flex w-full items-center gap-3 p-4 text-left"
            >
              <ProductAvatar iconKey="basket" colorToken="pantry" />
              <span>
                <span className="block font-medium">Aggiungi &ldquo;{query.trim()}&rdquo;</span>
                <span className="tag text-[var(--color-ink-3)]">Senza corsia, in fondo al percorso</span>
              </span>
            </button>
          )}

          <ul className="mt-2 space-y-2">
            {hits.map((hit, i) => {
              const already = inList.get(hit.name);
              return (
                <li key={hit.id} style={{ animation: `rise .28s ${Math.min(i, 12) * 25}ms both` }}>
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        await addProduct(listId, hit.id);
                        // Torna subito alla lista: si aggiunge una cosa per volta
                        // e si vuole vedere l'effetto prima di cercare la prossima.
                        reset();
                      })
                    }
                    className="plate flex w-full items-center gap-3 p-3 text-left transition-transform active:scale-[0.99]"
                  >
                    <ProductAvatar
                      iconKey={hit.iconKey}
                      fallback={hit.categoryIcon}
                      colorToken={hit.colorToken}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{hit.name}</span>
                      <span className="mt-1 flex items-center gap-2">
                        {hit.aisleName && <AisleBadge aisle={hit.aisleName} detail={hit.size} tone="soft" />}
                        {!hit.confirmed && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-[var(--color-signal)]"
                            title="Posizione da confermare"
                          />
                        )}
                      </span>
                    </span>
                    <span
                      className="font-display flex h-9 w-9 items-center justify-center rounded-full text-lg"
                      style={{
                        background: already ? "var(--color-brand)" : "var(--color-paper-2)",
                        color: already ? "var(--color-paper)" : "var(--color-ink)",
                      }}
                    >
                      {already ? already.qty : "+"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <section className="mt-4 pb-28">
          {items.length === 0 ? (
            <div className="mt-2">
              <div className="plate p-6 text-center">
                <p className="font-display text-lg">Lista vuota</p>
                <p className="mt-1 text-sm text-[var(--color-ink-3)]">
                  Cerca un prodotto o apri un reparto qui sopra.
                </p>
              </div>

              {frequent.length > 0 && (
                <div className="mt-7">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="tag text-[var(--color-ink-2)]">Comprati spesso</h3>
                    <span className="h-px flex-1 bg-[var(--color-line)]" />
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {frequent.map((product) => (
                      <li key={product.id}>
                        <button
                          type="button"
                          onClick={() => startTransition(() => addProduct(listId, product.id))}
                          className="plate flex w-full items-center gap-2.5 p-2.5 text-left transition-transform active:scale-[0.98]"
                        >
                          <ProductAvatar
                            iconKey={product.iconKey}
                            fallback={product.categoryIcon}
                            colorToken={product.colorToken}
                            size="sm"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{product.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            grouped.map(([categoryName, group]) => (
              <div key={categoryName} className="mb-6">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: `var(--${group[0].colorToken})` }}
                  />
                  <h3 className="tag text-[var(--color-ink-2)]">{categoryName}</h3>
                  <span className="h-px flex-1 bg-[var(--color-line)]" />
                </div>

                <ul className="space-y-2">
                  {group.map((item) => (
                    <li key={item.id} className="plate p-3">
                      <div className="flex items-start gap-3">
                        <ProductAvatar
                          iconKey={item.iconKey}
                          fallback={item.categoryIcon}
                          colorToken={item.colorToken}
                        />

                        <div className="min-w-0 flex-1 pt-0.5">
                          <p className="truncate font-medium">{item.name}</p>
                          {item.note ? (
                            <p className="truncate text-[13px] text-[var(--color-signal)]">{item.note}</p>
                          ) : null}
                          <div className="mt-1.5 flex">
                            <AisleBadge
                              aisle={item.aisleName ?? "Senza corsia"}
                              detail={item.locationLabel}
                              tone="soft"
                            />
                          </div>
                        </div>

                        {/* Comandi impilati: sulla riga singola il nome finiva troncato. */}
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <div className="flex items-center gap-0.5 rounded-full bg-[var(--color-paper-2)] p-1">
                            <button
                              type="button"
                              aria-label="Togli uno"
                              onClick={() => startTransition(() => setQty(item.id, item.qty - 1))}
                              className="h-7 w-7 rounded-full text-[var(--color-ink-2)] active:bg-[var(--color-paper-3)]"
                            >
                              −
                            </button>
                            <span className="font-display w-4 text-center text-sm">{item.qty}</span>
                            <button
                              type="button"
                              aria-label="Aggiungi uno"
                              onClick={() => startTransition(() => setQty(item.id, item.qty + 1))}
                              className="h-7 w-7 rounded-full text-[var(--color-ink-2)] active:bg-[var(--color-paper-3)]"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.productId && (
                              <button
                                type="button"
                                aria-label={`Salva ${item.name} con la sua nota`}
                                onClick={() =>
                                  startTransition(() => saveProduct(item.productId!, item.note ?? ""))
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-full"
                                style={
                                  savedKeys.has(`${item.productId}::${item.note ?? ""}`)
                                    ? { background: "var(--color-brand-soft)", color: "var(--color-brand)" }
                                    : { color: "var(--color-ink-3)" }
                                }
                              >
                                <Icon name="bookmark" size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Aggiungi una nota a ${item.name}`}
                              onClick={() => setEditingNote(editingNote === item.id ? null : item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-full"
                              style={
                                item.note || editingNote === item.id
                                  ? { background: "var(--color-signal-soft)", color: "var(--color-signal)" }
                                  : { color: "var(--color-ink-3)" }
                              }
                            >
                              <Icon name="pencil" size={15} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Rimuovi ${item.name}`}
                              onClick={() => startTransition(() => removeItem(item.id))}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-3)]"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>

                      {editingNote === item.id && (
                        <NoteField
                          initial={item.note ?? ""}
                          onSave={(note) => {
                            setEditingNote(null);
                            startTransition(() => setNote(item.id, note));
                          }}
                          onCancel={() => setEditingNote(null)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      {items.length > 0 && !browsing && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-5"
          style={{ paddingBottom: "calc(1.25rem + var(--safe-b))" }}
        >
          <form action={routeAndOpen.bind(null, listId)}>
            <button
              type="submit"
              disabled={pending}
              className="font-display flex w-full items-center justify-between rounded-full bg-[var(--color-ink)] px-6 py-4 text-left text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <span className="text-lg">Calcola il percorso</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-sm">{total}</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

/** Campo per la nota personale: marca, formato, "quello verde", quel che serve. */
function NoteField({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div className="mt-2.5 flex items-center gap-2 border-t border-[var(--color-line)] pt-2.5">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value);
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Marca, formato, dettaglio…"
        enterKeyHint="done"
        className="min-w-0 flex-1 rounded-full bg-[var(--color-paper-2)] px-3.5 py-2 text-sm outline-none placeholder:text-[var(--color-ink-3)]"
      />
      <button
        type="button"
        onClick={() => onSave(value)}
        className="shrink-0 rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-paper)]"
      >
        Salva
      </button>
    </div>
  );
}
