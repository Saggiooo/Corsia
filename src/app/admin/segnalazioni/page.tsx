import Link from "next/link";
import { getMappedStores, getPickLocations, getReports } from "@/lib/queries";
import { ReportCard, type ReportView } from "./ReportCard";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: undefined, label: "Da decidere", status: "pending" as const },
  { key: "accettate", label: "Accettate", status: "accepted" as const },
  { key: "rifiutate", label: "Rifiutate", status: "rejected" as const },
];

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    .format(value);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  const { stato } = await searchParams;
  const filter = FILTERS.find((f) => f.key === stato) ?? FILTERS[0];

  const [reports, stores] = await Promise.all([getReports(filter.status), getMappedStores()]);
  const locations = await getPickLocations(stores[0].id);

  const views: ReportView[] = reports.map((report) => ({
    id: report.id,
    status: report.status,
    createdAt: formatDate(report.createdAt),
    author: `${report.user.firstName} ${report.user.lastName}`,
    authorEmail: report.user.email,
    storeName: report.store.name,
    productName: report.product.name,
    iconKey: report.product.iconKey,
    categoryIcon: report.product.category.iconKey,
    colorToken: report.product.category.colorToken,
    previousLabel: report.previous?.label ?? null,
    suggestedLabel: report.suggested?.label ?? null,
    suggestedId: report.suggestedLocationId,
    message: report.message,
    resolvedBy: report.resolvedBy ? `${report.resolvedBy.firstName} ${report.resolvedBy.lastName}` : null,
    resolutionNote: report.resolutionNote,
  }));

  return (
    <>
      <h1 className="font-display text-3xl leading-tight">Segnalazioni</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-3)]">
        Accettandone una il prodotto viene spostato davvero e la posizione diventa confermata.
      </p>

      <div className="mt-4 flex gap-2">
        {FILTERS.map((entry) => (
          <Link
            key={entry.label}
            href={entry.key ? `/admin/segnalazioni?stato=${entry.key}` : "/admin/segnalazioni"}
            className="rounded-full border px-3 py-1.5 text-xs font-medium"
            style={
              entry.status === filter.status
                ? { background: "var(--color-ink)", borderColor: "transparent", color: "var(--color-paper)" }
                : { borderColor: "var(--color-line)", color: "var(--color-ink-2)" }
            }
          >
            {entry.label}
          </Link>
        ))}
      </div>

      {views.length === 0 ? (
        <p className="plate mt-4 p-6 text-center text-sm text-[var(--color-ink-3)]">
          Niente qui.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {views.map((report, i) => (
            <li key={report.id} style={{ animation: `rise .35s ${Math.min(i, 10) * 40}ms both` }}>
              <ReportCard report={report} locations={locations} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
