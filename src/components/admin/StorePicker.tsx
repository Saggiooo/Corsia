import Link from "next/link";
import { Icon } from "@/components/icons/Icon";

export type AdminStore = {
  id: string;
  name: string;
  address: string | null;
  status: "active" | "comingSoon";
  aisles: number;
  products: number;
};

/** Elenco dei supermercati su cui un admin puo' lavorare. */
export function StorePicker({
  stores,
  hrefFor,
}: {
  stores: AdminStore[];
  hrefFor: (storeId: string) => string;
}) {
  return (
    <ul className="mt-5 space-y-2.5">
      {stores.map((store, index) => {
        const comingSoon = store.status === "comingSoon";

        return (
          <li key={store.id} style={{ animation: `rise .4s ${index * 60}ms both` }}>
            <Link href={hrefFor(store.id)} className="plate flex items-center gap-4 p-4 active:scale-[0.99]">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
                style={{
                  background: comingSoon ? "var(--color-paper-3)" : "var(--color-brand-soft)",
                  color: comingSoon ? "var(--color-ink-3)" : "var(--color-brand)",
                }}
              >
                <Icon name={comingSoon ? "clock" : "cart"} size={24} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{store.name}</span>
                <span className="block truncate text-xs text-[var(--color-ink-3)]">
                  {comingSoon
                    ? "Prossimamente · da mappare"
                    : `${store.aisles} corsie · ${store.products} prodotti posizionati`}
                </span>
              </span>

              <span className="text-[var(--color-ink-3)]">›</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
