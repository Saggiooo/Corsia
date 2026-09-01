"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction, type SignUpState } from "./actions";
import { Wordmark } from "@/components/ui/Wordmark";

const INITIAL: SignUpState = { error: null, done: false, values: { firstName: "", lastName: "", email: "" } };

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, INITIAL);

  if (state.done) {
    return (
      <>
        <div className="mb-8">
          <p className="tag text-[var(--color-brand)]">Richiesta inviata</p>
          <Wordmark className="mt-1" />
        </div>

        <p className="plate p-5 text-[15px] leading-relaxed">
          Un amministratore deve approvare il tuo account prima che tu possa entrare. Quando è
          fatto, accedi con l&apos;email e la password che hai scelto.
        </p>

        <Link
          href="/accedi"
          className="font-display mt-4 block w-full rounded-full bg-[var(--color-ink)] py-4 text-center text-lg text-[var(--color-paper)]"
        >
          Torna all&apos;accesso
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mb-8">
        <p className="tag text-[var(--color-ink-3)]">Chiedi un account</p>
        <Wordmark className="mt-1" />
      </div>

      <form action={action} className="space-y-3">
        <div className="flex gap-3">
          <label className="min-w-0 flex-1">
            <span className="tag text-[var(--color-ink-3)]">Nome</span>
            <input
              name="firstName"
              defaultValue={state.values.firstName}
              autoComplete="given-name"
              required
              autoFocus
              className="plate mt-1.5 w-full px-4 py-3.5 text-[15px] outline-none focus:border-[var(--color-ink)]"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="tag text-[var(--color-ink-3)]">Cognome</span>
            <input
              name="lastName"
              defaultValue={state.values.lastName}
              autoComplete="family-name"
              required
              className="plate mt-1.5 w-full px-4 py-3.5 text-[15px] outline-none focus:border-[var(--color-ink)]"
            />
          </label>
        </div>

        <label className="block">
          <span className="tag text-[var(--color-ink-3)]">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={state.values.email}
            autoComplete="email"
            inputMode="email"
            required
            className="plate mt-1.5 w-full px-4 py-3.5 text-[15px] outline-none focus:border-[var(--color-ink)]"
          />
        </label>

        <label className="block">
          <span className="tag text-[var(--color-ink-3)]">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="plate mt-1.5 w-full px-4 py-3.5 text-[15px] outline-none focus:border-[var(--color-ink)]"
          />
          <span className="mt-1 block text-xs text-[var(--color-ink-3)]">Almeno 8 caratteri.</span>
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
          {pending ? "Invio…" : "Chiedi l'accesso"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--color-ink-3)]">
        Hai già un account?{" "}
        <Link href="/accedi" className="underline">
          Accedi
        </Link>
      </p>
    </>
  );
}
