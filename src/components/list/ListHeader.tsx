"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteList, renameList } from "@/app/actions";

export function ListHeader({ listId, name }: { listId: string; name: string }) {
  const [value, setValue] = useState(name);
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const commit = () => {
    const next = value.trim();
    if (next === name) return;
    startTransition(() => renameList(listId, next));
  };

  return (
    <header className="mb-3 flex items-center justify-between gap-2">
      <Link
        href="/"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
        aria-label="Torna alla home"
      >
        ‹
      </Link>

      <div className="min-w-0 flex-1 text-center">
        <p className="tag text-[var(--color-ink-3)]">Lista</p>
        <input
          ref={input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") input.current?.blur();
          }}
          aria-label="Nome della lista"
          className="font-display -mt-0.5 w-full bg-transparent text-center text-xl leading-tight outline-none focus:underline focus:decoration-[var(--color-signal)] focus:underline-offset-4"
        />
      </div>

      <button
        type="button"
        onClick={() => (confirming ? startTransition(() => deleteList(listId)) : setConfirming(true))}
        onBlur={() => setConfirming(false)}
        className={`h-9 shrink-0 rounded-full border px-3 text-xs ${
          confirming
            ? "border-transparent bg-[var(--color-signal)] text-[var(--color-paper)]"
            : "border-[var(--color-line)] text-[var(--color-ink-3)]"
        }`}
      >
        {confirming ? "Sicuro?" : "Elimina"}
      </button>
    </header>
  );
}
