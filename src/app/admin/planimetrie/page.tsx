import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { StorePicker } from "@/components/admin/StorePicker";
import { getStoresForAdmin } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PlanimetriePage() {
  const stores = await getStoresForAdmin();

  return (
    <>
      <h1 className="font-display text-3xl leading-tight">Planimetrie</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-3)]">
        Di quale supermercato vuoi disegnare la mappa?
      </p>

      <StorePicker stores={stores} hrefFor={(id) => `/mappa/modifica?negozio=${id}`} />

      <Link
        href="/admin"
        className="mt-6 flex items-center gap-2 text-sm text-[var(--color-ink-3)]"
      >
        <Icon name="box" size={16} /> Torna all&apos;amministrazione
      </Link>
    </>
  );
}
