import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignUpForm } from "./SignUpForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-12">
      <SignUpForm />
    </main>
  );
}
