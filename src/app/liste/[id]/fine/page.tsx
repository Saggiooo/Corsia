import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductAvatar } from "@/components/ui/ProductAvatar";
import { getList } from "@/lib/queries";
import type { RouteSnapshot } from "@/lib/route-types";

export const dynamic = "force-dynamic";

function minutesBetween(from: Date | null, to: Date | null): number | null {
  if (!from || !to) return null;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 60000));
}

export default async function DonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = await getList(id);
  if (!list) notFound();

  const snapshot = (list.route?.stops as unknown as RouteSnapshot | undefined) ?? {
    stops: [],
    orphans: [],
  };
  const taken = list.items.filter((i) => i.checked);
  const missed = list.items.filter((i) => !i.checked);
  const actual = minutesBetween(list.startedAt, list.completedAt);

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-12 pb-16">
      <p className="tag text-[var(--color-brand)]">Spesa conclusa</p>
      <h1 className="font-display mt-1 text-4xl leading-[0.95]">{list.name}</h1>

      <div className="mt-8 grid grid-cols-3 gap-2">
        {[
          { label: "Presi", value: `${taken.length}` },
          { label: "Metri", value: `${list.route?.distanceM ?? 0}` },
          { label: "Minuti", value: actual ? `${actual}` : `~${list.route?.estMinutes ?? 0}` },
        ].map((stat) => (
          <div key={stat.label} className="plate px-3 py-4 text-center">
            <p className="font-display text-3xl leading-none">{stat.value}</p>
            <p className="tag mt-2 text-[var(--color-ink-3)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {actual && list.route && (
        <p className="mt-3 text-center text-sm text-[var(--color-ink-3)]">
          {actual <= list.route.estMinutes
            ? `Più veloce della stima di ${list.route.estMinutes - actual} min.`
            : `${actual - list.route.estMinutes} min oltre la stima.`}
        </p>
      )}

      {missed.length > 0 && (
        <section className="mt-9">
          <h2 className="font-display text-lg">Non presi</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-3)]">
            Restano fuori dalla lista. Se non erano al loro posto, correggi la posizione la prossima volta.
          </p>
          <ul className="mt-3 space-y-2">
            {missed.map((item) => {
              const stop = snapshot.stops.find((s) => s.itemId === item.id);
              return (
                <li key={item.id} className="plate flex items-center gap-3 p-3">
                  <ProductAvatar
                    iconKey={stop?.iconKey ?? item.product?.iconKey}
                    fallback={stop?.categoryIcon ?? item.product?.category.iconKey}
                    colorToken={stop?.colorToken ?? item.product?.category.colorToken}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {item.product?.name ?? item.rawText}
                  </span>
                  <span className="tag text-[var(--color-ink-3)]">{stop?.aisleName ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-10 space-y-3">
        <Link
          href="/"
          className="font-display block w-full rounded-full bg-[var(--color-ink)] py-4 text-center text-lg text-[var(--color-paper)]"
        >
          Torna alla home
        </Link>
        <Link
          href={`/liste/${id}`}
          className="block w-full rounded-full border border-[var(--color-line)] py-3.5 text-center text-[var(--color-ink-2)]"
        >
          Rivedi la lista
        </Link>
      </div>
    </main>
  );
}
