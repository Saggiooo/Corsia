import Link from "next/link";
import { notFound } from "next/navigation";
import { ListEditor, type EditorItem } from "@/components/list/ListEditor";
import { getCategories, getList } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Toglie il nome della corsia dall'etichetta: nella riga sta gia' nella targa. */
function shortLocation(label?: string | null, aisleName?: string | null): string | null {
  if (!label) return null;
  if (aisleName && label.startsWith(`${aisleName} · `)) return label.slice(aisleName.length + 3);
  return label;
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [list, categories] = await Promise.all([getList(id), getCategories()]);
  if (!list) notFound();

  const items: EditorItem[] = list.items.map((item) => {
    const placement = item.product?.placements[0];
    return {
      id: item.id,
      name: item.product?.name ?? item.rawText,
      size: item.product?.size ?? null,
      qty: item.qty,
      iconKey: item.product?.iconKey ?? null,
      categoryName: item.product?.category.name ?? "Senza corsia",
      categoryIcon: item.product?.category.iconKey ?? "basket",
      colorToken: item.product?.category.colorToken ?? "pantry",
      aisleName: placement?.location.aisle.name ?? null,
      locationLabel: shortLocation(placement?.location.label, placement?.location.aisle.name),
      confirmed: placement?.confidence === "confirmed",
    };
  });

  return (
    <main className="mx-auto w-full max-w-lg px-5 pt-6">
      <header className="mb-3 flex items-center justify-between">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
          aria-label="Torna alla home"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="tag text-[var(--color-ink-3)]">Lista</p>
          <h1 className="font-display -mt-0.5 text-xl leading-tight">{list.name}</h1>
        </div>
        <span className="w-9" />
      </header>

      <ListEditor
        listId={list.id}
        items={items}
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          iconKey: c.iconKey,
          colorToken: c.colorToken,
        }))}
      />
    </main>
  );
}
