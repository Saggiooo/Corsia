"use client";

import { useState, useTransition } from "react";
import { acceptReport, rejectReport } from "@/app/actions";
import { ProductAvatar } from "@/components/ui/ProductAvatar";

export type AdminLocationOption = { id: string; label: string; aisleName: string };

export type ReportView = {
  id: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  author: string;
  authorEmail: string;
  storeName: string;
  productName: string;
  iconKey: string | null;
  categoryIcon: string;
  colorToken: string;
  previousLabel: string | null;
  suggestedLabel: string | null;
  suggestedId: string | null;
  message: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
};

const STATUS = {
  pending: { label: "Da decidere", background: "var(--color-signal-soft)", color: "var(--color-signal)" },
  accepted: { label: "Accettata", background: "var(--color-brand-soft)", color: "var(--color-brand)" },
  rejected: { label: "Rifiutata", background: "var(--color-paper-3)", color: "var(--color-ink-2)" },
};

export function ReportCard({
  report,
  locations,
}: {
  report: ReportView;
  locations: AdminLocationOption[];
}) {
  const [override, setOverride] = useState(report.suggestedId ?? "");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const status = STATUS[report.status];
  const changed = override !== (report.suggestedId ?? "");

  return (
    <article className="plate p-4">
      <div className="flex items-start gap-3">
        <ProductAvatar
          iconKey={report.iconKey}
          fallback={report.categoryIcon}
          colorToken={report.colorToken}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{report.productName}</p>
          <p className="text-xs text-[var(--color-ink-3)]">
            {report.storeName} · {report.author} · {report.createdAt}
          </p>
        </div>
        <span
          className="tag shrink-0 rounded-full px-2.5 py-1"
          style={{ background: status.background, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-[var(--color-ink-3)]">Secondo l&apos;app</dt>
          <dd className="min-w-0 flex-1">{report.previousLabel ?? "nessuna posizione"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 text-[var(--color-ink-3)]">Propone</dt>
          <dd className="min-w-0 flex-1 font-medium text-[var(--color-signal)]">
            {report.suggestedLabel ?? "non indicata"}
          </dd>
        </div>
        {report.message && (
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-[var(--color-ink-3)]">Nota</dt>
            <dd className="min-w-0 flex-1">{report.message}</dd>
          </div>
        )}
      </dl>

      {report.status === "pending" ? (
        <div className="mt-4 border-t border-[var(--color-line)] pt-3">
          <label className="block">
            <span className="tag text-[var(--color-ink-3)]">
              {changed ? "Posizione corretta da te" : "Applica questa posizione"}
            </span>
            <select
              value={override}
              onChange={(e) => setOverride(e.target.value)}
              className="mt-1.5 w-full rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-2.5 text-sm outline-none"
            >
              <option value="">Nessuna posizione scelta</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </select>
          </label>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo, facoltativo"
            className="mt-2 w-full rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--color-ink-3)]"
          />

          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              disabled={pending || !override}
              onClick={() => startTransition(() => acceptReport(report.id, override, note))}
              className="font-display flex-1 rounded-full bg-[var(--color-brand)] py-3 text-[var(--color-paper)] disabled:opacity-40"
            >
              {changed ? "Accetta corretta" : "Accetta"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => rejectReport(report.id, note))}
              className="rounded-full border border-[var(--color-line)] px-4 py-3 text-sm disabled:opacity-40"
            >
              Rifiuta
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-ink-3)]">
          {report.status === "accepted" ? "Accettata" : "Rifiutata"}
          {report.resolvedBy ? ` da ${report.resolvedBy}` : ""}
          {report.resolutionNote ? ` — ${report.resolutionNote}` : ""}
        </p>
      )}
    </article>
  );
}
