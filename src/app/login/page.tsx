import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <section className="space-y-6">
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
        <p role="alert" className="text-danger">
          That sign-in link didn&apos;t work. It may have expired or already been used. Please
          request a new one.
        </p>
      )}
      <LoginForm next={safeNext(typeof next === "string" ? next : undefined)} />
    </>
  );
}
