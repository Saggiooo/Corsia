"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { parseGrid, type Point } from "@/lib/routing/grid";
import { mergeCells } from "@/lib/map/shapes";
import { pullString, roundedPathD, splitLegs } from "@/lib/map/trace";

export type MapFixture = {
  kind: string;
  label?: string | null;
  colorToken?: string | null;
  cells: number[][];
};

export type MapLabel = { x: number; y: number; text: string; muted?: boolean };

export type MapStop = { x: number; y: number; index: number; done?: boolean };

export type Focus = { x: number; y: number; w: number; h: number };

type Props = {
  grid: string[];
  fixtures: MapFixture[];
  entrance: [number, number];
  checkout: [number, number];
  labels?: MapLabel[];
  path?: number[][];
  /** Tratta in corso: disegnata sopra il percorso, in un colore suo. */
  legPath?: number[][];
  stops?: MapStop[];
  activeIndex?: number;
  /** Inquadra solo questa porzione di mappa invece di tutto il negozio. */
  focus?: Focus;
  /** Cella di prelievo da evidenziare: lo scaffale accanto viene marcato. */
  targetCell?: { x: number; y: number };
  interactive?: boolean;
  padding?: number;
  className?: string;
  onPickCell?: (x: number, y: number) => void;
};

const KIND_FILL: Record<string, string> = {
  counter: "var(--tint)",
  fridge: "var(--tint)",
  freezer: "var(--tint)",
  checkout: "var(--checkout-soft)",
  shelf: "var(--color-paper-3)",
  promo: "var(--color-signal-soft)",
};

export function StoreMap({
  grid,
  fixtures,
  entrance,
  checkout,
  labels = [],
  path,
  legPath,
  stops = [],
  activeIndex,
  focus,
  targetCell,
  interactive = false,
  padding = 1,
  className,
  onPickCell,
}: Props) {
  const width = grid[0]?.length ?? 0;
  const height = grid.length;

  const shapes = useMemo(
    () =>
      fixtures.map((fixture) => ({
        ...fixture,
        rects: mergeCells(fixture.cells),
      })),
    [fixtures],
  );

  const smooth = useCallback(
    (cells: number[][], anchors: { x: number; y: number }[]) => {
      if (cells.length < 2) return null;

      const parsed = parseGrid(grid);
      const points: Point[] = cells.map(([x, y]) => ({ x, y }));

      return splitLegs(points, anchors)
        .map((leg) =>
          roundedPathD(
            pullString(parsed, leg).map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 })),
            0.9,
          ),
        )
        .filter(Boolean)
        .join(" ");
    },
    [grid],
  );

  const legTrace = useMemo(() => (legPath ? smooth(legPath, []) : null), [legPath, smooth]);

  const trace = useMemo(() => {
    if (!path || path.length < 2) return null;

    // Lo string-pulling ragiona in indici di cella e va applicato tratta per
    // tratta, con le tappe come ancore: sull'intero percorso taglierebbe via
    // le discese in corsia. Il mezzo cella si aggiunge solo per disegnare,
    // cosi' il tracciato passa al centro del corridoio.
    const parsed = parseGrid(grid);
    const cells: Point[] = path.map(([x, y]) => ({ x, y }));
    const legs = splitLegs(cells, stops);

    return legs
      .map((leg) =>
        roundedPathD(
          pullString(parsed, leg).map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 })),
          0.9,
        ),
      )
      .filter(Boolean)
      .join(" ");
  }, [grid, path, stops]);

  const view = focus
    ? { x: focus.x, y: focus.y, w: focus.w, h: focus.h }
    : { x: -padding, y: -padding, w: width + padding * 2, h: height + padding * 2 };

  /**
   * Piu' prodotti sullo stesso scaffale condividono la cella: disegnati uno
   * sopra l'altro sarebbero illeggibili, quindi diventano un pin solo che
   * riporta l'intervallo di tappe.
   */
  const groupedStops = useMemo(() => {
    const groups = new Map<string, MapStop[]>();
    for (const stop of stops) {
      const key = `${stop.x},${stop.y}`;
      groups.set(key, [...(groups.get(key) ?? []), stop]);
    }

    return [...groups.entries()].map(([key, group]) => {
      const indexes = group.map((s) => s.index).sort((a, b) => a - b);
      const first = indexes[0] + 1;
      const last = indexes[indexes.length - 1] + 1;

      return {
        key,
        x: group[0].x,
        y: group[0].y,
        label: indexes.length === 1 ? String(first) : `${first}–${last}`,
        done: group.every((s) => s.done),
        active: activeIndex !== undefined && indexes.includes(activeIndex),
      };
    });
  }, [stops, activeIndex]);

  /**
   * Lo scaffale da cui prendere il prodotto: e' la cella occupata accanto al
   * punto di prelievo. Si marca il lato giusto del corridoio, che e' l'unica
   * cosa che serve sapere una volta arrivati in corsia.
   */
  const shelfEdges = useMemo(() => {
    if (!targetCell) return [];
    const parsed = parseGrid(grid);

    return (
      [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const
    )
      .filter(([dx, dy]) => !parsed.walkable(targetCell.x + dx, targetCell.y + dy))
      .filter(
        ([dx, dy]) =>
          targetCell.x + dx >= 0 &&
          targetCell.y + dy >= 0 &&
          targetCell.x + dx < width &&
          targetCell.y + dy < height,
      )
      .map(([dx, dy]) => ({ x: targetCell.x + dx, y: targetCell.y + dy }));
  }, [targetCell, grid, width, height]);

  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const moved = useRef(false);

  const toCell = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const scale = Math.min(rect.width / view.w, rect.height / view.h);
      const offsetX = (rect.width - view.w * scale) / 2;
      const offsetY = (rect.height - view.h * scale) / 2;

      const local = {
        x: (clientX - rect.left - offsetX - transform.x) / (scale * transform.k) + view.x,
        y: (clientY - rect.top - offsetY - transform.y) / (scale * transform.k) + view.y,
      };
      return { x: Math.floor(local.x), y: Math.floor(local.y) };
    },
    [transform, view.h, view.w, view.x, view.y],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    if (!interactive) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    moved.current = false;
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (drag.current?.id === event.pointerId) drag.current = null;
    if (!moved.current && onPickCell) {
      const cell = toCell(event.clientX, event.clientY);
      if (cell) onPickCell(cell.x, cell.y);
    }
  };

  const zoom = (factor: number) =>
    setTransform((t) => ({ ...t, k: Math.min(6, Math.max(0.6, t.k * factor)) }));

  return (
    <div className={className} style={{ position: "relative", touchAction: interactive ? "none" : "auto" }}>
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="h-full w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <pattern id="floor-dots" width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.08" fill="var(--color-ink-3)" opacity="0.45" />
          </pattern>
          <filter id="fixture-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.22" stdDeviation="0.22" floodColor="#17150f" floodOpacity="0.16" />
          </filter>
        </defs>

        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {/* Pavimento */}
          <rect
            x={view.x}
            y={view.y}
            width={view.w}
            height={view.h}
            rx={1.2}
            fill="var(--color-paper-2)"
          />
          <rect x={0} y={0} width={width} height={height} fill="url(#floor-dots)" />
          <rect
            x={0.15}
            y={0.15}
            width={width - 0.3}
            height={height - 0.3}
            rx={0.8}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={0.3}
          />

          {/* Blocchi */}
          {shapes.map((fixture, i) => {
            const tint = fixture.colorToken ? `var(--${fixture.colorToken}-soft)` : undefined;
            const edge = fixture.colorToken ? `var(--${fixture.colorToken})` : "var(--color-line)";
            return (
              <g key={i} style={{ "--tint": tint } as React.CSSProperties} filter="url(#fixture-shadow)">
                {fixture.rects.map((r, j) => (
                  <rect
                    key={j}
                    x={r.x + 0.12}
                    y={r.y + 0.12}
                    width={r.w - 0.24}
                    height={r.h - 0.24}
                    rx={0.55}
                    fill={KIND_FILL[fixture.kind] ?? "var(--color-paper-3)"}
                    stroke={edge}
                    strokeOpacity={fixture.colorToken ? 0.5 : 1}
                    strokeWidth={0.14}
                  />
                ))}
              </g>
            );
          })}

          {/* Etichette di reparto e corsia */}
          {labels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={label.muted ? 0.95 : 1.15}
              fontWeight={700}
              letterSpacing="0.02"
              fill={label.muted ? "var(--color-ink-3)" : "var(--color-ink-2)"}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {label.text}
            </text>
          ))}

          {/* Percorso */}
          {trace && (
            <>
              <path
                d={trace}
                fill="none"
                stroke="var(--color-signal)"
                strokeOpacity={0.18}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={trace}
                fill="none"
                stroke="var(--color-signal)"
                strokeOpacity={legTrace ? 0.34 : 1}
                strokeWidth={0.55}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
                style={{ animation: "draw 1.6s cubic-bezier(.22,.61,.36,1) forwards" }}
              />
            </>
          )}

          {/* Tratta in corso */}
          {legTrace && (
            <>
              <path
                d={legTrace}
                fill="none"
                stroke="var(--color-leg)"
                strokeOpacity={0.16}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={legTrace}
                fill="none"
                stroke="var(--color-leg)"
                strokeWidth={0.62}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1}
                style={{ animation: "draw 1.1s cubic-bezier(.22,.61,.36,1) forwards" }}
              />
            </>
          )}

          {/* Ingresso e casse */}
          <g>
            <circle cx={entrance[0] + 0.5} cy={entrance[1] + 0.5} r={1.1} fill="var(--color-brand)" />
            <path
              d={`M${entrance[0] + 0.05} ${entrance[1] + 0.5} h1 M${entrance[0] + 0.6} ${entrance[1] + 0.1} l0.45 0.4 -0.45 0.4`}
              stroke="var(--color-paper)"
              strokeWidth={0.18}
              fill="none"
              strokeLinecap="round"
            />
            <circle cx={checkout[0] + 0.5} cy={checkout[1] + 0.5} r={1.1} fill="var(--color-ink)" />
            <path
              d={`M${checkout[0] + 0.02} ${checkout[1] + 0.28} h0.35 l0.25 0.72 h0.9 l0.2 -0.55 h-1`}
              stroke="var(--color-paper)"
              strokeWidth={0.15}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Scaffale bersaglio */}
          {shelfEdges.map((cell, i) => (
            <rect
              key={`shelf-${i}`}
              x={cell.x + 0.06}
              y={cell.y + 0.06}
              width={0.88}
              height={0.88}
              rx={0.3}
              fill="var(--color-signal)"
              fillOpacity={0.5}
              stroke="var(--color-signal)"
              strokeWidth={0.2}
            />
          ))}

          {/* Tappe */}
          {groupedStops.map((stop) => {
            const active = stop.active;
            return (
              <g key={stop.key} transform={`translate(${stop.x + 0.5} ${stop.y + 0.5})`}>
                {active && (
                  <circle
                    r={1.3}
                    fill="var(--color-signal)"
                    opacity={0.4}
                    style={{ animation: "pulse-ring 1.8s ease-out infinite" }}
                  />
                )}
                <circle
                  r={active ? 1.25 : 1}
                  fill={stop.done ? "var(--color-brand)" : active ? "var(--color-signal)" : "var(--color-ink)"}
                  stroke="var(--color-paper)"
                  strokeWidth={0.18}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={(active ? 1.25 : 1.05) * (stop.label.length > 2 ? 0.78 : 1)}
                  fontWeight={700}
                  fill="var(--color-paper)"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stop.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {interactive && (
        <div className="absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-full border border-[var(--color-line)] bg-[var(--color-paper)]/90 backdrop-blur">
          <button
            type="button"
            aria-label="Ingrandisci"
            onClick={() => zoom(1.35)}
            className="px-3 py-2 text-lg leading-none active:bg-[var(--color-paper-2)]"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Rimpicciolisci"
            onClick={() => zoom(1 / 1.35)}
            className="border-t border-[var(--color-line)] px-3 py-2 text-lg leading-none active:bg-[var(--color-paper-2)]"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Ricentra"
            onClick={() => setTransform({ k: 1, x: 0, y: 0 })}
            className="border-t border-[var(--color-line)] px-3 py-2 text-xs active:bg-[var(--color-paper-2)]"
          >
            ⤾
          </button>
        </div>
      )}
    </div>
  );
}
