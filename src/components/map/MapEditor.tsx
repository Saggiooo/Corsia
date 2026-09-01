"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateAisles, saveMap, setStoreStatus, type CellPaint } from "@/app/actions";
import { mergeCells } from "@/lib/map/shapes";

type Tool = {
  id: string;
  kind: string;
  label: string;
  /// Nome scritto sul blocco e usato come nome della corsia.
  name?: string;
  color?: string;
  swatch: string;
};

/**
 * La palette e' fatta di reparti, non di forme generiche: dipingendo
 * "Ortofrutta" il blocco nasce gia' col suo colore e col suo nome, che poi
 * diventa il nome della corsia quando si generano i punti di prelievo.
 */
const TOOLS: Tool[] = [
  { id: "shelf", kind: "shelf", label: "Scaffale", swatch: "var(--color-paper-3)" },
  { id: "ortofrutta", kind: "counter", label: "Ortofrutta", name: "Ortofrutta", color: "produce", swatch: "var(--produce-soft)" },
  { id: "forno", kind: "counter", label: "Forno", name: "Forno", color: "bakery", swatch: "var(--bakery-soft)" },
  { id: "macelleria", kind: "counter", label: "Macelleria", name: "Macelleria", color: "meat", swatch: "var(--meat-soft)" },
  { id: "pescheria", kind: "counter", label: "Pescheria", name: "Pescheria", color: "fish", swatch: "var(--fish-soft)" },
  { id: "salumi", kind: "counter", label: "Salumi", name: "Salumi e formaggi", color: "deli", swatch: "var(--deli-soft)" },
  { id: "latticini", kind: "fridge", label: "Frigo", name: "Latticini", color: "dairy", swatch: "var(--dairy-soft)" },
  { id: "surgelati", kind: "freezer", label: "Surgelati", name: "Surgelati", color: "frozen", swatch: "var(--frozen-soft)" },
  { id: "bevande", kind: "shelf", label: "Bevande", name: "Bevande", color: "drinks", swatch: "var(--drinks-soft)" },
  { id: "casa", kind: "shelf", label: "Casa", name: "Cura della casa", color: "home", swatch: "var(--home-soft)" },
  { id: "promo", kind: "promo", label: "Promo", name: "Promozioni", color: "sweet", swatch: "var(--sweet-soft)" },
  { id: "checkout", kind: "checkout", label: "Casse", color: "checkout", swatch: "var(--checkout-soft)" },
  { id: "wall", kind: "wall", label: "Muro", swatch: "var(--color-ink-3)" },
  { id: "floor", kind: "floor", label: "Gomma", swatch: "var(--color-paper-2)" },
];

const BY_ID = new Map(TOOLS.map((tool) => [tool.id, tool]));

/** Aspetto dei blocchi senza colore di reparto. */
const FILL: Record<string, string> = {
  shelf: "var(--color-paper-3)",
  counter: "var(--meat-soft)",
  fridge: "var(--dairy-soft)",
  freezer: "var(--frozen-soft)",
  checkout: "var(--checkout-soft)",
  promo: "var(--sweet-soft)",
  wall: "var(--color-ink-2)",
};

const STROKE: Record<string, string> = {
  counter: "var(--meat)",
  fridge: "var(--dairy)",
  freezer: "var(--frozen)",
  checkout: "var(--checkout)",
  promo: "var(--sweet)",
};

type Props = {
  storeId: string;
  storeName: string;
  status: "active" | "comingSoon";
  width: number;
  height: number;
  cells: CellPaint[];
  entrance: [number, number];
  checkout: [number, number];
};

export function MapEditor({
  storeId,
  storeName,
  status,
  width,
  height,
  cells,
  entrance,
  checkout,
}: Props) {
  // Valore = "tipo::colore". Il colore conserva la tinta di reparto originale
  // dei blocchi che non tocchi.
  const [painted, setPainted] = useState<Map<string, string>>(
    () => new Map(cells.map((c) => [`${c.x},${c.y}`, `${c.kind}::${c.color ?? ""}::${c.label ?? ""}`])),
  );
  const [tool, setTool] = useState<string | null>(null);
  const [markers, setMarkers] = useState({ entrance, checkout });
  const [placing, setPlacing] = useState<"entrance" | "checkout" | null>(null);
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const [report, setReport] = useState<{ blocked: string[]; unreachable: string[] } | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState<number | null>(null);
  const [saving, startSaving] = useTransition();
  const router = useRouter();

  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<{ mode: "paint" | "pan"; x: number; y: number } | null>(null);

  const padding = 1;
  const view = { x: -padding, y: -padding, w: width + padding * 2, h: height + padding * 2 };

  const shapes = useMemo(() => {
    const byStyle = new Map<string, number[][]>();
    for (const [key, style] of painted) {
      const [x, y] = key.split(",").map(Number);
      byStyle.set(style, [...(byStyle.get(style) ?? []), [x, y]]);
    }
    return [...byStyle.entries()].map(([style, list]) => {
      const [kind, color, label] = style.split("::");
      return { style, kind, color, label, rects: mergeCells(list) };
    });
  }, [painted]);

  const toCell = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / view.w, rect.height / view.h);
      const offsetX = (rect.width - view.w * scale) / 2;
      const offsetY = (rect.height - view.h * scale) / 2;

      const x = Math.floor((clientX - rect.left - offsetX - transform.x) / (scale * transform.k) + view.x);
      const y = Math.floor((clientY - rect.top - offsetY - transform.y) / (scale * transform.k) + view.y);

      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      return { x, y };
    },
    [transform, view.h, view.w, view.x, view.y, width, height],
  );

  const paintAt = (clientX: number, clientY: number) => {
    const cell = toCell(clientX, clientY);
    if (!cell || !tool) return;

    setPainted((current) => {
      const next = new Map(current);
      const key = `${cell.x},${cell.y}`;
      const selected = BY_ID.get(tool);
      if (!selected || selected.kind === "floor") next.delete(key);
      else next.set(key, `${selected.kind}::${selected.color ?? ""}::${selected.name ?? ""}`);
      return next;
    });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);

    if (placing) {
      const cell = toCell(event.clientX, event.clientY);
      if (cell) {
        setMarkers((m) => ({ ...m, [placing]: [cell.x, cell.y] as [number, number] }));
        setPlacing(null);
      }
      return;
    }

    if (tool) {
      gesture.current = { mode: "paint", x: event.clientX, y: event.clientY };
      paintAt(event.clientX, event.clientY);
    } else {
      gesture.current = { mode: "pan", x: event.clientX, y: event.clientY };
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const active = gesture.current;
    if (!active) return;

    if (active.mode === "paint") {
      paintAt(event.clientX, event.clientY);
      return;
    }

    setTransform((t) => ({
      ...t,
      x: t.x + event.clientX - active.x,
      y: t.y + event.clientY - active.y,
    }));
    gesture.current = { ...active, x: event.clientX, y: event.clientY };
  };

  const endGesture = () => {
    gesture.current = null;
  };

  const save = () =>
    startSaving(async () => {
      const payload: CellPaint[] = [...painted].map(([key, style]) => {
        const [x, y] = key.split(",").map(Number);
        const [kind, color, label] = style.split("::");
        return { x, y, kind, color: color || null, label: label || null };
      });

      const result = await saveMap({
        storeId,
        cells: payload,
        entrance: markers.entrance,
        checkout: markers.checkout,
      });

      setReport(result);
      router.refresh();
    });

  const generate = (force: boolean) =>
    startSaving(async () => {
      const result = await generateAisles(storeId, force);
      setConfirmWipe(null);

      if (result.ok) {
        setGenerated(`${result.aisles} corsie e ${result.locations} punti di prelievo.`);
        return;
      }

      if (result.reason === "placements") {
        setConfirmWipe(result.placements);
        setGenerated(null);
        return;
      }

      setGenerated("Nessun blocco con un lato raggiungibile: disegna prima scaffali e banchi.");
    });

  const zoom = (factor: number) =>
    setTransform((t) => ({ ...t, k: Math.min(8, Math.max(0.6, t.k * factor)) }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1" style={{ touchAction: "none" }}>
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="h-full w-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endGesture}
          onPointerCancel={endGesture}
        >
          <defs>
            <pattern id="edit-grid" width="1" height="1" patternUnits="userSpaceOnUse">
              <path d="M1 0V1H0" fill="none" stroke="var(--color-line)" strokeWidth="0.03" />
            </pattern>
          </defs>

          <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
            <rect x={view.x} y={view.y} width={view.w} height={view.h} fill="var(--color-paper-2)" rx={1} />
            <rect x={0} y={0} width={width} height={height} fill="url(#edit-grid)" />

            {shapes.map((shape) => (
              <g key={shape.style}>
                {shape.label &&
                  shape.rects
                    .filter((r) => r.w >= 3 || r.h >= 3)
                    .map((r, i) => (
                      <text
                        key={`label-${i}`}
                        x={r.x + r.w / 2}
                        y={r.y + r.h / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.min(1.4, Math.max(0.8, Math.min(r.w, r.h) * 0.5))}
                        fontWeight={700}
                        fill="var(--color-ink-2)"
                        style={{ fontFamily: "var(--font-display)", pointerEvents: "none" }}
                      >
                        {shape.label}
                      </text>
                    ))}
                {shape.rects.map((r, i) => (
                  <rect
                    key={i}
                    x={r.x + 0.1}
                    y={r.y + 0.1}
                    width={r.w - 0.2}
                    height={r.h - 0.2}
                    rx={0.5}
                    fill={shape.color ? `var(--${shape.color}-soft)` : (FILL[shape.kind] ?? "var(--color-paper-3)")}
                    stroke={shape.color ? `var(--${shape.color})` : (STROKE[shape.kind] ?? "var(--color-line)")}
                    strokeOpacity={0.55}
                    strokeWidth={0.12}
                  />
                ))}
              </g>
            ))}

            <circle cx={markers.entrance[0] + 0.5} cy={markers.entrance[1] + 0.5} r={1} fill="var(--color-brand)" />
            <circle cx={markers.checkout[0] + 0.5} cy={markers.checkout[1] + 0.5} r={1} fill="var(--color-ink)" />
          </g>
        </svg>

        <div className="absolute top-3 right-3 flex flex-col overflow-hidden rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]/90 backdrop-blur">
          <button type="button" onClick={() => zoom(1.4)} className="px-3 py-2 leading-none" aria-label="Ingrandisci">
            +
          </button>
          <button
            type="button"
            onClick={() => zoom(1 / 1.4)}
            className="border-t border-[var(--color-line)] px-3 py-2 leading-none"
            aria-label="Rimpicciolisci"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setTransform({ k: 1, x: 0, y: 0 })}
            className="border-t border-[var(--color-line)] px-3 py-2 text-xs"
            aria-label="Ricentra"
          >
            ⤾
          </button>
        </div>

        {placing && (
          <p className="absolute inset-x-3 top-3 rounded-full bg-[var(--color-ink)] px-4 py-2 text-center text-sm text-[var(--color-paper)]">
            Tocca dove mettere {placing === "entrance" ? "l'ingresso" : "le casse"}
          </p>
        )}
      </div>

      <div
        className="border-t border-[var(--color-line)] bg-[var(--color-paper)] px-4 pt-3"
        style={{ paddingBottom: "calc(1rem + var(--safe-b))" }}
      >
        {report && (
          <div className="mb-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-3 text-sm">
            {report.blocked.length === 0 && report.unreachable.length === 0 ? (
              <p className="text-[var(--color-brand)]">Mappa salvata. Tutti i punti di prelievo sono raggiungibili.</p>
            ) : (
              <>
                <p className="font-medium text-[var(--color-signal)]">Mappa salvata, ma con problemi:</p>
                {report.blocked.length > 0 && (
                  <p className="mt-1 text-[var(--color-ink-2)]">
                    {report.blocked.length} punti finiti sotto un blocco ({report.blocked.slice(0, 3).join(", ")}
                    {report.blocked.length > 3 ? "…" : ""})
                  </p>
                )}
                {report.unreachable.length > 0 && (
                  <p className="mt-1 text-[var(--color-ink-2)]">
                    {report.unreachable.length} punti non raggiungibili dall&apos;ingresso (
                    {report.unreachable.slice(0, 3).join(", ")}
                    {report.unreachable.length > 3 ? "…" : ""})
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <button
            type="button"
            onClick={() => setTool(null)}
            className="shrink-0 rounded-full border px-3 py-2 text-xs font-medium whitespace-nowrap"
            style={
              tool === null
                ? { background: "var(--color-ink)", color: "var(--color-paper)", borderColor: "transparent" }
                : { borderColor: "var(--color-line)" }
            }
          >
            ✋ Sposta
          </button>

          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium whitespace-nowrap"
              style={
                tool === t.id
                  ? { background: "var(--color-ink)", color: "var(--color-paper)", borderColor: "transparent" }
                  : { borderColor: "var(--color-line)" }
              }
            >
              <span className="h-3 w-3 rounded-[4px]" style={{ background: t.swatch }} />
              {t.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPlacing("entrance")}
            className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-2 text-xs whitespace-nowrap"
          >
            Ingresso
          </button>
          <button
            type="button"
            onClick={() => setPlacing("checkout")}
            className="shrink-0 rounded-full border border-[var(--color-line)] px-3 py-2 text-xs whitespace-nowrap"
          >
            Casse
          </button>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="font-display mt-3 w-full rounded-full bg-[var(--color-ink)] py-3.5 text-lg text-[var(--color-paper)] disabled:opacity-60"
        >
          {saving ? "Salvo…" : `Salva la mappa di ${storeName}`}
        </button>

        {generated && (
          <p className="mt-2 rounded-2xl bg-[var(--color-brand-soft)] px-4 py-2.5 text-sm text-[var(--color-brand)]">
            {generated}{" "}
            <Link href={`/admin/corsie?negozio=${storeId}`} className="underline">
              Dai i nomi alle corsie
            </Link>
          </p>
        )}

        {confirmWipe !== null ? (
          <div className="mt-2 rounded-2xl bg-[var(--color-signal-soft)] p-3 text-sm text-[var(--color-signal)]">
            <p>
              Rigenerare cancella {confirmWipe} posizioni di prodotto già assegnate in questo
              supermercato. Continuo?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => generate(true)}
                className="rounded-full bg-[var(--color-signal)] px-4 py-2 text-[var(--color-paper)]"
              >
                Sì, rigenera
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipe(null)}
                className="rounded-full border border-[var(--color-signal)] px-4 py-2"
              >
                Annulla
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => generate(false)}
            className="mt-2 w-full rounded-full border border-[var(--color-ink)] py-2.5 text-sm font-medium text-[var(--color-ink)] disabled:opacity-60"
          >
            Genera corsie e punti di prelievo
          </button>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() =>
            startSaving(() => setStoreStatus(storeId, status === "active" ? "comingSoon" : "active"))
          }
          className="mt-2 w-full rounded-full border border-[var(--color-line)] py-2.5 text-sm text-[var(--color-ink-2)] disabled:opacity-60"
        >
          {status === "active"
            ? "Rimetti in “prossimamente”"
            : "Rendi utilizzabile: la planimetria è pronta"}
        </button>
      </div>
    </div>
  );
}
