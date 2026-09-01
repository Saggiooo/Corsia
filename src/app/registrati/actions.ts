"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/crypto";

export type SignUpState = {
  error: string | null;
  done: boolean;
  /**
   * React azzera il form quando l'azione finisce: senza rimandare indietro
   * quello che era stato scritto, a ogni errore si ricomincia da capo. La
   * password non torna indietro apposta.
   */
  values: { firstName: string; lastName: string; email: string };
};

/**
 * Oltre questo numero di richieste in attesa la registrazione si chiude: la
 * pagina e' pubblica, e un tetto evita che qualcuno riempia il database senza
 * bloccare l'uso normale. Si riapre appena un admin smaltisce la coda.
 */
const MAX_PENDING = 20;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const values = { firstName, lastName, email };
  const fail = (error: string): SignUpState => ({ error, done: false, values });

  if (!firstName || !lastName) return fail("Servono nome e cognome.");
  if (!EMAIL.test(email)) return fail("Questo indirizzo email non sembra valido.");
  if (password.length < 8) return fail("La password deve avere almeno 8 caratteri.");

  const pending = await prisma.user.count({ where: { status: "pending" } });
  if (pending >= MAX_PENDING) return fail("Ci sono troppe richieste in attesa. Riprova più tardi.");

  // Se l'indirizzo e' gia' registrato non si crea nulla e non si dice nulla:
  // la risposta e' identica, altrimenti la pagina direbbe a chiunque quali
  // indirizzi hanno un account.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash: hashPassword(password),
        role: "member",
        status: "pending",
      },
    });
  }

  return { error: null, done: true, values };
}
