import Link from "next/link";
import { StoreMap } from "@/components/map/StoreMap";
import { getMapData, getStore } from "@/lib/queries";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LEGEND = [
  { token: "produce", label: "Ortofrutta" },
  { token: "bakery", label: "Forno" },
  { token: "meat", label: "Macelleria" },
  { token: "fish", label: "Pescheria" },
  { token: "dairy", label: "Frigo" },
  { token: "frozen", label: "Surgelati" },
  { token: "checkout", label: "Casse" },
];

export default async function MapPage() {
  const user = await requireUser();
  const store = await getStore();
  const map = await getMapData(store.id);
  const meters = (cells: number) => Math.round((cells * store.cellSizeCm) / 100);

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="flex items-center justify-between px-5 pt-6 pb-3">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
          aria-label="Torna alla home"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="tag text-[var(--color-ink-3)]">Mappa</p>
          <h1 className="font-display -mt-0.5 text-xl leading-tight">{store.name}</h1>
        </div>
        {user.role === "admin" ? (
          <Link
            href="/mappa/modifica"
            className="rounded-full border border-[var(--color-line)] px-3 py-1.5 text-xs text-[var(--color-ink-2)]"
          >
            Modifica
          </Link>
        ) : (
          <span className="w-9" />
        )}
      </header>

      <div className="min-h-0 flex-1 px-3">
        <StoreMap
          grid={map.grid}
          fixtures={map.fixtures}
          entrance={map.entrance}
          checkout={map.checkout}
          labels={map.labels}
          interactive
          className="h-full w-full"
        />
      </div>

      <footer className="px-5 pt-3" style={{ paddingBottom: "calc(1.5rem + var(--safe-b))" }}>
        <p className="tag mb-2 text-[var(--color-ink-3)]">
          {meters(store.gridW)} × {meters(store.gridH)} m · celle da {store.cellSizeCm} cm
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGEND.map((entry) => (
            <span key={entry.token} className="flex items-center gap-1.5 text-xs text-[var(--color-ink-2)]">
              <span
                className="h-3 w-3 rounded-[4px]"
                style={{ background: `var(--${entry.token}-soft)`, boxShadow: `inset 0 0 0 1px var(--${entry.token})` }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      </footer>
    </main>
  );
}
