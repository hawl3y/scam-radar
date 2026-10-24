import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "./report-form";

export const metadata: Metadata = { title: "Report a scam" };

export default function ReportPage() {
  return (
    <section className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Report a scam</h1>
      <p>Tell neighbors what to watch for. It takes about a minute.</p>
      <Suspense fallback={<p>Loading…</p>}>
        <Report />
      </Suspense>
    </section>
  );
}

async function Report() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) redirect("/login?next=/report");

  const { data: profile } = await supabase.from("profiles").select("home_zip").maybeSingle();
  return <ReportForm defaultZip={profile?.home_zip ?? ""} />;
}
