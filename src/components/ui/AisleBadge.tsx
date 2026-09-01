type Props = {
  aisle: string;
  detail?: string | null;
  tone?: "ink" | "signal" | "soft";
  className?: string;
};

/** Targa di segnaletica: corsia in evidenza, dettaglio scaffale sotto. */
export function AisleBadge({ aisle, detail, tone = "soft", className = "" }: Props) {
  const tones = {
    ink: "bg-[var(--color-ink)] text-[var(--color-paper)] border-transparent",
    signal: "bg-[var(--color-signal)] text-[var(--color-paper)] border-transparent",
    soft: "bg-[var(--color-paper-2)] text-[var(--color-ink-2)] border-[var(--color-line)]",
  };

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 ${tones[tone]} ${className}`}
    >
      <span className="tag font-display leading-none">{aisle}</span>
      {detail && <span className="text-[11px] leading-none opacity-70">{detail}</span>}
    </span>
  );
}
