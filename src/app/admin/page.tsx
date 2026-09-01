import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import { countPendingReports } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const pending = await countPendingReports();

  const entries = [
    {
      href: "/admin/planimetrie",
      icon: "box",
      title: "Planimetrie",
      description: "Scegli un supermercato e disegnane scaffali, banchi e casse.",
      badge: null as number | null,
    },
    {
      href: "/admin/posizioni",
      icon: "basket",
      title: "Posizioni prodotti",
      description: "Scegli un supermercato e sposta prodotti o interi reparti.",
      badge: null,
    },
    {
      href: "/admin/segnalazioni",
      icon: "flag",
      title: "Segnalazioni",
      description: "Cosa dicono i membri che non torna, e cosa propongono.",
      badge: pending || null,
    },
  ];

  return (
    <>
      <h1 className="font-display text-3xl leading-tight">Amministrazione</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-3)]">
        Da qui si cambia quello che vedono tutti: mappe e posizioni sono in comune.
      </p>

      <ul className="mt-7 space-y-2.5">
        {entries.map((entry, i) => (
          <li key={entry.href} style={{ animation: `rise .4s ${i * 60}ms both` }}>
            <Link href={entry.href} className="plate flex items-center gap-4 p-4 active:scale-[0.99]">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-paper-2)] text-[var(--color-ink-2)]">
                <Icon name={entry.icon} size={24} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{entry.title}</span>
                <span className="block text-xs text-[var(--color-ink-3)]">{entry.description}</span>
              </span>
              {entry.badge ? (
                <span className="font-display flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--color-signal)] px-2 text-sm text-[var(--color-paper)]">
                  {entry.badge}
                </span>
              ) : (
                <span className="text-[var(--color-ink-3)]">›</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
