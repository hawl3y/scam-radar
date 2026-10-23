import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DEFAULT_RADIUS, RADIUS_OPTIONS } from "@/lib/profile-schema";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <Suspense fallback={<p>Loading your settings…</p>}>
        <Settings searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Settings({ searchParams }: Pick<PageProps<"/settings">, "searchParams">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login?next=/settings");

  const [{ data: profile }, { welcome }] = await Promise.all([
    supabase.from("profiles").select("home_zip, radius_miles").maybeSingle(),
    searchParams,
  ]);
  const radius = (RADIUS_OPTIONS as readonly number[]).includes(profile?.radius_miles ?? NaN)
    ? profile!.radius_miles
    : DEFAULT_RADIUS;

  return (
    <>
      {welcome && (
        <p className="rounded-md border-2 border-accent p-4">
          Welcome! Tell us roughly where you are so we can show scams reported near you.
        </p>
      )}
      <p className="text-muted">Signed in as {String(auth.claims.email ?? "")}</p>
      <SettingsForm homeZip={profile?.home_zip ?? ""} radiusMiles={radius} />
      <form action="/auth/signout" method="post">
        <button type="submit" className="min-h-12 underline">
          Sign out
        </button>
      </form>
    </>
  );
}
