import type { Metadata } from "next";
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

// Open to everyone; sign-in happens at Post, inside the form.
async function Report() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return <ReportForm signedIn={false} defaultZip="" hasHomeZip={false} />;

  const { data: profile } = await supabase.from("profiles").select("home_zip").maybeSingle();
  let zip = profile?.home_zip ?? "";
  if (!zip) {
    const { data: last } = await supabase.rpc("my_last_report_zip");
    zip = (last as string | null) ?? "";
  }
  return <ReportForm signedIn defaultZip={zip} hasHomeZip={Boolean(profile?.home_zip)} />;
}
