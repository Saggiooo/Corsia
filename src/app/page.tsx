import Link from "next/link";
import { createList, toggleFavoriteStore } from "@/app/actions";
import { Icon } from "@/components/icons/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import { countListsElsewhere, getLists, getStores, pruneEmptyLists } from "@/lib/queries";
import { requireUser } from "@/lib/auth/session";
import { signOutAction } from "@/app/accedi/actions";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ negozio?: string }>;
}) {
  const { negozio } = await searchParams;
  const user = await requireUser();

  // Chi torna qui ha finito di preparare: le liste rimaste vuote non servono.
  await pruneEmptyLists(user.id);

  const stores = await getStores(user.id);
  const selected = stores.find((store) => store.id === negozio) ?? stores[0];
  const ready = selected.status === "active";

  const [lists, elsewhere] = await Promise.all([
    getLists(user.id, selected.id),
    countListsElsewhere(user.id, selected.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-10 pb-32">
      <header className="flex items-end justify-between">
        <div>
          <p className="tag text-[var(--color-ink-3)]">Ciao {user.firstName}</p>
          <Wordmark className="mt-1" />
        </div>
        <div className="mb-2 flex items-center gap-2">
          {user.role === "admin" && (
            <Link
              href="/admin"
              className="rounded-full border border-[var(--color-ink)] bg-[var(--color-ink)] px-3 py-1.5 text-xs font-medium text-[var(--color-paper)]"
            >
              Admin
            </Link>
          )}
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

      <section className="mt-8 space-y-3">
        {stores.map((store, index) => {
          const comingSoon = store.status === "comingSoon";
          const active = store.id === selected.id;

          const star = (
            <form action={toggleFavoriteStore.bind(null, store.id)}>
              <button
                type="submit"
                aria-label={store.favorite ? "Togli dai preferiti" : "Aggiungi ai preferiti"}
                aria-pressed={store.favorite}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
                style={
                  store.favorite
                    ? { background: "var(--bakery-soft)", color: "var(--bakery)" }
                    : { color: "var(--color-ink-3)" }
                }
              >
                <Icon name="star" size={22} />
              </button>
            </form>
          );

          // Compresso: una riga cliccabile che porta la selezione su questo negozio.
          if (!active) {
            return (
              <article
                key={store.id}
                className="plate flex items-center gap-3 p-3.5"
                style={{ animation: `rise .4s ${index * 60}ms both`, opacity: comingSoon ? 0.7 : 1 }}
              >
                <Link href={`/?negozio=${store.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]"
                    style={{
                      background: comingSoon ? "var(--color-paper-3)" : "var(--color-brand-soft)",
                      color: comingSoon ? "var(--color-ink-3)" : "var(--color-brand)",
                    }}
                  >
                    <Icon name={comingSoon ? "clock" : "cart"} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{store.name}</span>
                    <span className="tag text-[var(--color-ink-3)]">
                      {comingSoon ? "Prossimamente" : "Tocca per usarlo"}
                    </span>
                  </span>
                </Link>
                {star}
              </article>
            );
          }

          // Selezionato: grande, con la sua mappa.
          return (
            <article
              key={store.id}
              // Il bordo scuro, non un ring: .plate imposta gia' box-shadow e lo sovrascriverebbe.
              className="plate grain relative overflow-hidden"
              style={{ animation: "rise .4s both", borderColor: "var(--color-ink)" }}
            >
              <div className="flex items-start justify-between gap-4 p-5 pb-3">
                <div className="min-w-0">
                  {comingSoon ? (
                    <span className="tag inline-flex items-center gap-1.5 rounded-full bg-[var(--color-paper-3)] px-2.5 py-1 text-[var(--color-ink-2)]">
                      <Icon name="clock" size={13} />
                      Prossimamente
                    </span>
                  ) : (
                    <p className="tag text-[var(--color-brand)]">Stai usando</p>
                  )}
                  <h2 className="font-display mt-1.5 truncate text-2xl leading-tight">{store.name}</h2>
                  <p className="mt-1 text-sm text-[var(--color-ink-3)]">{store.address}</p>
                </div>
                {star}
              </div>

              {comingSoon ? (
                <p className="px-5 pb-5 text-sm text-[var(--color-ink-3)]">
                  Non è ancora mappato: appena la planimetria è pronta lo trovi qui.
                </p>
              ) : (
                <Link
                  href={`/mappa?negozio=${store.id}`}
                  className="flex items-center gap-3 border-t border-[var(--color-line)] px-5 py-3.5 active:bg-[var(--color-paper-2)]"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                    style={{ background: "var(--color-brand-soft)", color: "var(--color-brand)" }}
                  >
                    <Icon name="map" size={18} />
                  </span>
                  <span className="flex-1 text-sm font-medium">Vedi la mappa</span>
                  <span className="text-[var(--color-ink-3)]">›</span>
                </Link>
              )}
            </article>
          );
        })}
      </section>

      <section className="mt-9">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg">Le tue liste</h2>
          {/* Sono solo quelle del negozio selezionato: il nome sta su ogni riga. */}
          <span className="text-xs text-[var(--color-ink-3)]">{lists.length}</span>
        </div>

        {lists.length === 0 ? (
          <p className="plate mt-3 p-5 text-sm text-[var(--color-ink-3)]">
            Nessuna lista per {selected.name}. Creane una e Corsia calcola l&apos;ordine in cui
            prendere le cose.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {lists.map((list, i) => (
              <li key={list.id} style={{ animation: `rise .4s ${i * 40}ms both` }}>
                <Link
                  href={`/liste/${list.id}`}
                  className="plate flex items-center gap-4 p-4 transition-transform active:scale-[0.99]"
                >
                  {/* Pastiglia piena: quanti articoli ci sono, non a che punto sei. */}
                  <span
                    className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] text-[var(--color-paper)]"
                    style={{
                      background: "var(--color-signal)",
                      boxShadow: "0 0 0 4px var(--color-signal-soft)",
                    }}
                  >
                    {list._count.items}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{list.name}</span>
                    <span className="tag flex items-center gap-1 text-[var(--color-ink-3)]">
                      <Icon name="pin" size={12} className="shrink-0" />
                      <span className="truncate">{list.store.name}</span>
                    </span>
                  </span>

                  <span className="text-[var(--color-ink-3)]">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {elsewhere > 0 && (
          <p className="mt-3 px-1 text-xs text-[var(--color-ink-3)]">
            {elsewhere === 1
              ? "1 lista in un altro supermercato: cambia negozio qui sopra per vederla."
              : `${elsewhere} liste negli altri supermercati: cambia negozio qui sopra per vederle.`}
          </p>
        )}
      </section>

      {/* La barra e' fissa: una sfumatura di carta stacca il pulsante dal contenuto che ci scorre sotto. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-36"
        style={{
          background:
            "linear-gradient(to top, var(--color-paper) 38%, color-mix(in srgb, var(--color-paper) 70%, transparent) 68%, transparent)",
        }}
      />

      <form
        action={createList.bind(null, selected.id)}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg px-5"
        style={{ paddingBottom: "calc(1.25rem + var(--safe-b))" }}
      >
        <button
          type="submit"
          disabled={!ready}
          aria-label={
            ready ? `Nuova lista da ${selected.name}` : `${selected.name} non e' ancora disponibile`
          }
          className="grain relative flex w-full items-center gap-3.5 overflow-hidden rounded-[26px] bg-[var(--color-ink)] px-4 py-3 text-left text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.98] disabled:opacity-45"
        >
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px]"
            style={{
              background: "color-mix(in srgb, var(--color-brand) 34%, transparent)",
              color: "var(--color-brand-soft)",
            }}
          >
            <Icon name={ready ? "listPlus" : "clock"} size={22} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="font-display block text-lg leading-tight">
              {ready ? "Nuova lista" : "Non ancora disponibile"}
            </span>
            {/* Il supermercato non e' un suffisso del titolo: e' la destinazione, come su un cartello. */}
            <span
              className="tag mt-0.5 flex items-center gap-1.5"
              style={{ color: "color-mix(in srgb, var(--color-brand) 42%, var(--color-paper))" }}
            >
              <Icon name="pin" size={12} className="shrink-0" />
              <span className="truncate">{selected.name}</span>
            </span>
          </span>

          <span
            aria-hidden
            className="font-display shrink-0 pr-1 text-xl"
            style={{ color: "color-mix(in srgb, var(--color-paper) 45%, transparent)" }}
          >
            {ready ? "→" : "·"}
          </span>
        </button>
      </form>

    </main>
  );
}
