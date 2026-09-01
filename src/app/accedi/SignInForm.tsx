"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type SignInState } from "./actions";
import { Wordmark } from "@/components/ui/Wordmark";

const INITIAL: SignInState = { error: null, email: "" };

export function SignInForm({ target }: { target: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL);

  return (
    <>
      <div className="mb-10">
        <p className="tag text-[var(--color-ink-3)]">La spesa in ordine di corsia</p>
        <Wordmark className="mt-1" />
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="da" value={target} />

        <label className="block">
          <span className="tag text-[var(--color-ink-3)]">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={state.email}
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
            className="plate mt-1.5 w-full px-4 py-3.5 text-[15px] outline-none focus:border-[var(--color-ink)]"
          />
        </label>

        <label className="block">
          <span className="tag text-[var(--color-ink-3)]">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="plate mt-1.5 w-full px-4 py-3.5 text-[15px] outline-none focus:border-[var(--color-ink)]"
          />
        </label>

        {state.error && (
          <p
            role="alert"
            className="rounded-2xl bg-[var(--color-signal-soft)] px-4 py-3 text-sm text-[var(--color-signal)]"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="font-display w-full rounded-full bg-[var(--color-ink)] py-4 text-lg text-[var(--color-paper)] shadow-[var(--shadow-float)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Accedo…" : "Accedi"}
        </button>
      </form>

      <Link
        href="/registrati"
        className="mt-3 block w-full rounded-full border border-[var(--color-line)] py-3.5 text-center text-[var(--color-ink-2)]"
      >
        Registrati
      </Link>

      <p className="mt-8 text-center text-sm text-[var(--color-ink-3)]">
        Le registrazioni vanno approvate da un amministratore.
      </p>
    </>
  );
}
