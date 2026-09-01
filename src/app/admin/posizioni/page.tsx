import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { StorePicker } from "@/components/admin/StorePicker";
import {
  getCategories,
  getCategoryPlacements,
  getMappedStores,
  getPickLocations,
  getStoresForAdmin,
} from "@/lib/queries";
import { PositionsEditor } from "./PositionsEditor";

export const dynamic = "force-dynamic";

export default async function PositionsPage({
  searchParams,
}: {
  searchParams: Promise<{ reparto?: string; negozio?: string }>;
}) {
  const { reparto, negozio } = await searchParams;

  const [categories, stores] = await Promise.all([getCategories(), getMappedStores()]);
  const store = stores.find((s) => s.id === negozio);

  // Senza un supermercato scelto non si sa dove spostare: si chiede prima.
  if (!store) {
    const all = await getStoresForAdmin();

    return (
      <>
        <h1 className="font-display text-3xl leading-tight">Posizioni</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-3)]">
          In quale supermercato vuoi spostare i prodotti?
        </p>

        <StorePicker
          stores={all.filter((s) => s.status === "active")}
          hrefFor={(id) => `/admin/posizioni?negozio=${id}`}
        />

        {all.some((s) => s.status === "comingSoon") && (
          <p className="mt-5 text-xs text-[var(--color-ink-3)]">
            I supermercati ancora in &ldquo;prossimamente&rdquo; non compaiono: prima serve la
            planimetria, altrimenti non ci sono scaffali su cui mettere i prodotti.
          </p>
        )}

        <Link href="/admin" className="mt-6 flex items-center gap-2 text-sm text-[var(--color-ink-3)]">
          <Icon name="box" size={16} /> Torna all&apos;amministrazione
        </Link>
      </>
    );
  }

  const category = categories.find((c) => c.slug === reparto) ?? categories[0];

  const [products, locations] = await Promise.all([
    getCategoryPlacements(category.slug, store.id),
    getPickLocations(store.id),
  ]);

  return (
    <>
      <h1 className="font-display text-3xl leading-tight">Posizioni</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-3)]">
        Seleziona i prodotti da spostare, o sposta tutto il reparto in una volta.
      </p>

      <div className="mt-3 flex items-center gap-2">
        <span className="tag rounded-full bg-[var(--color-paper-2)] px-3 py-1.5 text-[var(--color-ink-2)]">
          {store.name}
        </span>
        <Link href="/admin/posizioni" className="text-xs text-[var(--color-ink-3)] underline">
          cambia
        </Link>
      </div>

      <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/admin/posizioni?negozio=${store.id}&reparto=${c.slug}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap"
            style={
              c.slug === category.slug
                ? { background: `var(--${c.colorToken})`, borderColor: "transparent", color: "var(--color-paper)" }
                : {
                    background: `var(--${c.colorToken}-soft)`,
                    borderColor: "transparent",
                    color: `var(--${c.colorToken})`,
                  }
            }
          >
            <Icon name={c.iconKey} size={15} />
            {c.name}
          </Link>
        ))}
      </div>

      <PositionsEditor
        storeId={store.id}
        storeName={store.name}
        categorySlug={category.slug}
        products={products}
        locations={locations}
      />
    </>
  );
}
