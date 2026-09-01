import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ da?: string }>;
}) {
  if (await getSessionUser()) redirect("/");

  const { da } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 pb-20">
      <SignInForm target={da ?? "/"} />
    </main>
  );
}
