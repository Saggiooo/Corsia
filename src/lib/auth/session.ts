import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE } from "./cookie";
import { newSessionToken, tokenFingerprint, verifyPassword } from "./crypto";

export { SESSION_COOKIE };

/** Sessioni lunghe: e' un'app personale, non si fa il login in mezzo alla spesa. */
const SESSION_DAYS = 90;

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "member";
};

/**
 * Utente della richiesta corrente, o null. Verifica sempre la sessione sul
 * database: il cookie da solo non e' una prova, il middleware controlla solo
 * che ci sia.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { fingerprint: tokenFingerprint(token) },
    include: { user: true },
  });

  // Un account revocato non deve poter usare una sessione gia' aperta.
  if (!session || session.expiresAt < new Date() || session.user.status !== "approved") return null;

  return {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    role: session.user.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/accedi");
  return user;
}

/**
 * Solo gli admin toccano mappe e posizioni. I membri segnalano e basta.
 * Chi non e' admin viene rimandato alla home, non alla pagina di accesso:
 * e' autenticato, semplicemente non ha i permessi.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

/**
 * Verifica le credenziali e apre una sessione. Il messaggio di errore e' lo
 * stesso sia che l'email non esista sia che la password sia sbagliata: non c'e'
 * motivo di far scoprire quali indirizzi hanno un account.
 *
 * Lo stato dell'account si controlla solo dopo aver verificato la password,
 * cosi' "in attesa di approvazione" lo legge chi possiede le credenziali e non
 * un estraneo che prova indirizzi a caso.
 */
export async function signIn(email: string, password: string): Promise<{ error: string } | null> {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Email o password non corrette." };
  }

  if (user.status === "pending") {
    return { error: "Il tuo account è in attesa di approvazione da parte di un amministratore." };
  }

  if (user.status === "rejected") {
    return { error: "La tua richiesta di accesso non è stata approvata." };
  }

  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { fingerprint: tokenFingerprint(token), userId: user.id, expiresAt },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return null;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { fingerprint: tokenFingerprint(token) } });
  }

  store.delete(SESSION_COOKIE);
}
