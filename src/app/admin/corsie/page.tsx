import Link from "next/link";
import { StorePicker } from "@/components/admin/StorePicker";
import { prisma } from "@/lib/db";
import { getStoresForAdmin } from "@/lib/queries";
import { AisleList, type AisleRow } from "./AisleList";

export const dynamic = "force-dynamic";

export default async function AislesPage({
  searchParams,
}: {
  searchParams: Promise<{ negozio?: string }>;
}) {
  const { negozio } = await searchParams;
  const stores = await getStoresForAdmin();
  const store = stores.find((s) => s.id === negozio);

  if (!store) {
    return (
      <>
        <h1 className="font-display text-3xl leading-tight">Corsie</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-3)]">Di quale supermercato?</p>
        <StorePicker stores={stores} hrefFor={(id) => `/admin/corsie?negozio=${id}`} />
      </>
    );
  }

  const aisles = await prisma.aisle.findMany({
    where: { storeId: store.id },
    orderBy: { sequence: "asc" },
    include: { _count: { select: { locations: true } } },
  });

  const rows: AisleRow[] = aisles.map((aisle) => ({
    id: aisle.id,
    number: aisle.number,
    name: aisle.name,
    sequence: aisle.sequence,
    locations: aisle._count.locations,
    vertical: aisle.vertical,
  }));

  return (
    <>
      <h1 className="font-display text-3xl leading-tight">Corsie</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-3)]">
        {store.name}. Il numero a sinistra è l&apos;ordine in cui le incontri girando: è da lì che
        parte il calcolo del percorso.
      </p>

      {rows.length === 0 ? (
        <div className="plate mt-5 p-6 text-center">
          <p className="font-display text-lg">Nessuna corsia</p>
          <p className="mt-1 text-sm text-[var(--color-ink-3)]">
            Disegna la planimetria e premi &ldquo;Genera corsie e punti di prelievo&rdquo;.
          </p>
          <Link
            href={`/mappa/modifica?negozio=${store.id}`}
            className="font-display mt-4 inline-block rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-[var(--color-paper)]"
          >
            Apri la planimetria
          </Link>
        </div>
      ) : (
        <AisleList aisles={rows} />
      )}

      <Link
        href={`/mappa/modifica?negozio=${store.id}`}
        className="mt-6 block text-sm text-[var(--color-ink-3)] underline"
      >
        Torna alla planimetria di {store.name}
      </Link>
    </>
  );
}
