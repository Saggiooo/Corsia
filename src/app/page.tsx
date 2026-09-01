import Link from "next/link";
import { createList, toggleFavoriteStore } from "@/app/actions";
import { Icon } from "@/components/icons/Icon";
import { StoreMap } from "@/components/map/StoreMap";
import { Wordmark } from "@/components/ui/Wordmark";
import { getLists, getMapData, getStore, isFavoriteStore } from "@/lib/queries";
import { requireUser } from "@/lib/auth/session";
import { signOutAction } from "@/app/accedi/actions";

export const dynamic = "force-dynamic";

function progressOf(items: { checked: boolean }[]) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((i) => i.checked).length / items.length) * 100);
}

const STATUS_LABEL: Record<string, string> = {
  draft: "In preparazione",
  routed: "Percorso pronto",
  shopping: "In corso",
  done: "Completata",
};

export default async function HomePage() {
  const user = await requireUser();
  const [store, map, lists] = await Promise.all([getStore(), getMapData(), getLists(user.id)]);
  const favorite = await isFavoriteStore(user.id, store.id);

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-10 pb-32">
      <header className="flex items-end justify-between">
        <div>
          <p className="tag text-[var(--color-ink-3)]">Ciao {user.firstName}</p>
          <Wordmark className="mt-1" />
        </div>
        <div className="mb-2 flex items-center gap-2">
          <Link
            href="/mappa"
            className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-2)] active:bg-[var(--color-paper-2)]"
          >
            Mappa
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-3)] active:bg-[var(--color-paper-2)]"
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      <section className="plate grain relative mt-8 overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div>
            <p className="tag text-[var(--color-brand)]">Supermercato</p>
            <h2 className="font-display mt-1 text-2xl leading-tight">{store.name}</h2>
            <p className="mt-1 text-sm text-[var(--color-ink-3)]">{store.address}</p>
          </div>
          <form action={toggleFavoriteStore.bind(null, store.id)}>
            <button
              type="submit"
              aria-label={favorite ? "Togli dai preferiti" : "Aggiungi ai preferiti"}
              aria-pressed={favorite}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
              style={
                favorite
                  ? { background: "var(--bakery-soft)", color: "var(--bakery)" }
                  : { color: "var(--color-ink-3)" }
              }
            >
              <Icon name="star" size={22} />
            </button>
          </form>
        </div>

        <div className="h-44 px-2 pb-2 opacity-90">
          <StoreMap
            grid={map.grid}
            fixtures={map.fixtures}
            entrance={map.entrance}
            checkout={map.checkout}
            className="h-full w-full"
          />
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg">Le tue liste</h2>
          <span className="text-xs text-[var(--color-ink-3)]">{lists.length}</span>
        </div>

        {lists.length === 0 ? (
          <p className="plate mt-3 p-5 text-sm text-[var(--color-ink-3)]">
            Nessuna lista. Creane una e Corsia calcola l&apos;ordine in cui prendere le cose.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {lists.map((list, i) => {
              const progress = progressOf(list.items);
              return (
                <li key={list.id} style={{ animation: `rise .4s ${i * 40}ms both` }}>
                  <Link
                    href={list.status === "shopping" ? `/liste/${list.id}/spesa` : `/liste/${list.id}`}
                    className="plate flex items-center gap-4 p-4 transition-transform active:scale-[0.99]"
                  >
                    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
                      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
                        <circle cx="20" cy="20" r="17" fill="none" stroke="var(--color-paper-3)" strokeWidth="4" />
                        <circle
                          cx="20"
                          cy="20"
                          r="17"
                          fill="none"
                          stroke={progress === 100 ? "var(--color-brand)" : "var(--color-signal)"}
                          strokeWidth="4"
                          strokeLinecap="round"
                          pathLength={100}
                          strokeDasharray={`${progress} 100`}
                        />
                      </svg>
                      <span className="font-display text-sm">{list._count.items}</span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{list.name}</span>
                      <span className="tag text-[var(--color-ink-3)]">{STATUS_LABEL[list.status]}</span>
                    </span>

                    <span className="text-[var(--color-ink-3)]">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form
        action={createList}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-5"
        style={{ paddingBottom: "calc(1.25rem + var(--safe-b))" }}
      >
        <button
          type="submit"
          className="font-display w-full rounded-full bg-[var(--color-ink)] py-4 text-lg text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.98]"
        >
          Nuova lista
        </button>
      </form>
    </main>
  );
}
