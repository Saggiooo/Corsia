import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RouteView } from "@/components/route/RouteView";
import { getList, getMapData } from "@/lib/queries";
import { requireUser } from "@/lib/auth/session";
import type { RouteSnapshot } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const list = await getList(id, user.id);
  if (!list) notFound();
  const map = await getMapData(list.storeId);

  if (!list.route) redirect(`/liste/${id}`);

  const snapshot = list.route.stops as unknown as RouteSnapshot;

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-6">
      <header className="flex items-center justify-between">
        <Link
          href={`/liste/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
          aria-label="Torna alla lista"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="tag text-[var(--color-ink-3)]">Percorso</p>
          <h1 className="font-display -mt-0.5 text-xl leading-tight">{list.name}</h1>
        </div>
        <span className="w-9" />
      </header>

      <RouteView
        listId={list.id}
        mode={list.route.mode}
        distanceM={list.route.distanceM}
        estMinutes={list.route.estMinutes}
        snapshot={snapshot}
        path={list.route.path as number[][]}
        map={map}
      />
    </main>
  );
}
