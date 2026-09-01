import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Tutto quello che sta sotto /admin passa da qui: nessuna pagina resta scoperta. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-lg px-5 pt-6 pb-16">
      <header className="mb-5 flex items-center justify-between">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-line)] text-[var(--color-ink-2)]"
          aria-label="Torna alla home"
        >
          ‹
        </Link>
        <p className="tag text-[var(--color-ink-3)]">Amministrazione</p>
        <span className="w-9" />
      </header>

      {children}
    </div>
  );
}
