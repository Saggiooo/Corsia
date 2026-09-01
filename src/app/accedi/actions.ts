"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth/session";

export type SignInState = {
  error: string | null;
  /** React azzera il form dopo l'azione: senza questo, a ogni tentativo
   * sbagliato si riscrive anche l'email. */
  email: string;
};

export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const target = String(formData.get("da") ?? "/");

  if (!email || !password) return { error: "Servono email e password.", email };

  const result = await signIn(email, password);
  if (result) return { ...result, email };

  // Solo percorsi interni: un "da" arbitrario sarebbe un redirect aperto.
  redirect(target.startsWith("/") && !target.startsWith("//") ? target : "/");
}

export async function signOutAction() {
  await signOut();
  redirect("/accedi");
}
