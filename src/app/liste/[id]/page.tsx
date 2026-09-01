import { notFound } from "next/navigation";
import { ListEditor, type EditorItem } from "@/components/list/ListEditor";
import { ListHeader } from "@/components/list/ListHeader";
import { getCategories, getList, getMostBought } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Toglie il nome della corsia dall'etichetta: nella riga sta gia' nella targa. */
function shortLocation(label?: string | null, aisleName?: string | null): string | null {
  if (!label) return null;
  if (aisleName && label.startsWith(`${aisleName} · `)) return label.slice(aisleName.length + 3);
  return label;
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [list, categories, frequent] = await Promise.all([getList(id), getCategories(), getMostBought()]);
  if (!list) notFound();

  const items: EditorItem[] = list.items.map((item) => {
    const placement = item.product?.placements[0];
    return {
      id: item.id,
      name: item.product?.name ?? item.rawText,
      size: item.product?.size ?? null,
      note: item.note,
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
      <ListHeader listId={list.id} name={list.name} />

      <ListEditor
        listId={list.id}
        items={items}
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          iconKey: c.iconKey,
          colorToken: c.colorToken,
        }))}
        frequent={frequent.map((p) => ({
          id: p.id,
          name: p.name,
          iconKey: p.iconKey,
          categoryIcon: p.category.iconKey,
          colorToken: p.category.colorToken,
        }))}
      />
    </main>
  );
}
