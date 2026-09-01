/** Logotipo: la "i" di Corsia e' il pallino di una tappa, il tracciato ci passa sotto. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span className="font-display text-[clamp(2.6rem,13vw,4rem)] leading-[0.9] tracking-[-0.05em]">
        Corsia
      </span>
      <svg
        className="pointer-events-none absolute -bottom-1 left-0 h-4 w-full overflow-visible"
        viewBox="0 0 120 12"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M2 9 C 22 9, 26 3, 46 3 S 74 10, 94 10 S 114 4, 118 4"
          fill="none"
          stroke="var(--color-signal)"
          strokeWidth="2.4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1}
          style={{ animation: "draw 1.4s .2s cubic-bezier(.22,.61,.36,1) forwards" }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
