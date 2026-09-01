import Link from "next/link";
import { MapEditor } from "@/components/map/MapEditor";
import { prisma } from "@/lib/db";
import { getStore } from "@/lib/queries";
import type { CellPaint } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function MapEditorPage() {
  const store = await getStore();
  const fixtures = await prisma.fixture.findMany({ where: { storeId: store.id } });

  const cells: CellPaint[] = fixtures
    .filter((f) => f.kind !== "entrance")
    .flatMap((fixture) =>
      (fixture.cells as number[][]).map(([x, y]) => ({
        x,
        y,
        kind: fixture.kind as string,
        color: fixture.colorToken,
      })),
    );

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <Link
          href="/mappa"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
          aria-label="Torna alla mappa"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="tag text-[var(--color-ink-3)]">Editor</p>
          <h1 className="font-display -mt-0.5 text-xl leading-tight">Planimetria</h1>
        </div>
        <span className="w-9" />
      </header>

      <MapEditor
        width={store.gridW}
        height={store.gridH}
        cells={cells}
        entrance={[store.entranceX, store.entranceY]}
        checkout={[store.checkoutX, store.checkoutY]}
      />
    </main>
  );
}
