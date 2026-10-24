import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <p>You need an account to report scams, confirm reports, and get alerts.</p>
      <Suspense>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function LoginFormWithParams({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next, error } = await searchParams;
  return (
    <>
      {error && (
        <p role="alert" className="rounded-md border-2 border-danger bg-surface p-4">
          That sign-in link didn&apos;t work. It may have expired, already been used, or been opened in a different
          app than the one you signed in from.
        </p>
      )}
      <LoginForm next={safeNext(typeof next === "string" ? next : undefined)} initialStep={error ? "code" : "email"} />
    </>
  );
}
