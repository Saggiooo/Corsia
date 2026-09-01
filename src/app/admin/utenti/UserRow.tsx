"use client";

import { useTransition } from "react";
import { approveUser, rejectUser, setUserRole } from "@/app/actions";

export type UserView = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "pending" | "approved" | "rejected";
  lists: number;
  createdAt: string;
  decidedBy: string | null;
  self: boolean;
};

const STATUS = {
  pending: { label: "Da approvare", background: "var(--color-signal-soft)", color: "var(--color-signal)" },
  approved: { label: "Attivo", background: "var(--color-brand-soft)", color: "var(--color-brand)" },
  rejected: { label: "Revocato", background: "var(--color-paper-3)", color: "var(--color-ink-2)" },
};

export function UserRow({ user }: { user: UserView }) {
  const [pending, startTransition] = useTransition();
  const status = STATUS[user.status];

  return (
    <article className="plate p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {user.name}
            {user.self && <span className="text-[var(--color-ink-3)]"> · tu</span>}
          </p>
          <p className="truncate text-xs text-[var(--color-ink-3)]">{user.email}</p>
          <p className="tag mt-1 text-[var(--color-ink-3)]">
            {user.role === "admin" ? "Admin" : "Member"} · {user.lists} liste · {user.createdAt}
          </p>
        </div>
        <span
          className="tag shrink-0 rounded-full px-2.5 py-1"
          style={{ background: status.background, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {user.status === "pending" ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => approveUser(user.id, "member"))}
            className="font-display flex-1 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-[var(--color-paper)] disabled:opacity-40"
          >
            Approva come member
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => approveUser(user.id, "admin"))}
            className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm disabled:opacity-40"
          >
            Come admin
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => rejectUser(user.id))}
            className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm text-[var(--color-signal)] disabled:opacity-40"
          >
            Rifiuta
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--color-line)] pt-3">
          {user.status === "approved" && !user.self && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(() => setUserRole(user.id, user.role === "admin" ? "member" : "admin"))
                }
                className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm disabled:opacity-40"
              >
                {user.role === "admin" ? "Rendi member" : "Rendi admin"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(() => rejectUser(user.id))}
                className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm text-[var(--color-signal)] disabled:opacity-40"
              >
                Revoca accesso
              </button>
            </>
          )}

          {user.status === "rejected" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => approveUser(user.id, "member"))}
              className="rounded-full border border-[var(--color-line)] px-4 py-2.5 text-sm disabled:opacity-40"
            >
              Riattiva
            </button>
          )}

          {user.self && (
            <p className="text-xs text-[var(--color-ink-3)]">
              Sul tuo account non puoi agire da qui.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
