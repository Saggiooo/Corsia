import { requireAdmin } from "@/lib/auth/session";
import { getUsers } from "@/lib/queries";
import { UserRow, type UserView } from "./UserRow";

export const dynamic = "force-dynamic";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "2-digit" }).format(value);
}

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await getUsers();

  const views: UserView[] = users.map((user) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role,
    status: user.status,
    lists: user._count.lists,
    createdAt: formatDate(user.createdAt),
    decidedBy: user.decidedBy ? `${user.decidedBy.firstName} ${user.decidedBy.lastName}` : null,
    self: user.id === me.id,
  }));

  const pending = views.filter((u) => u.status === "pending");
  const rest = views.filter((u) => u.status !== "pending");

  return (
    <>
      <h1 className="font-display text-3xl leading-tight">Utenti</h1>
      <p className="mt-1 text-sm text-[var(--color-ink-3)]">
        Chi si registra resta in attesa finché non lo approvi. Revocare un accesso chiude subito
        le sessioni aperte.
      </p>

      {pending.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="tag text-[var(--color-signal)]">Richieste</h2>
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>
          <ul className="space-y-3">
            {pending.map((user, i) => (
              <li key={user.id} style={{ animation: `rise .35s ${i * 40}ms both` }}>
                <UserRow user={user} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="tag text-[var(--color-ink-2)]">Account</h2>
          <span className="h-px flex-1 bg-[var(--color-line)]" />
        </div>
        <ul className="space-y-3">
          {rest.map((user) => (
            <li key={user.id}>
              <UserRow user={user} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
