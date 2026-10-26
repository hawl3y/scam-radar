import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EMAIL_DAILY_BUDGET } from "@/lib/alerts/budget";
import { criterionMark, evaluatePilot, sinceLaunch, type CriterionResult } from "@/lib/pilot";
import { getPilotMetrics } from "@/lib/pilot-report";
import { createClient } from "@/lib/supabase/server";
import { WeeklyTable } from "./weekly-table";

export const metadata: Metadata = { title: "Pilot metrics", robots: { index: false } };

export default function MetricsPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Pilot metrics</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Metrics />
      </Suspense>
    </section>
  );
}

async function Metrics() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  const { summary, weeks } = await getPilotMetrics(26);
  const criteria = evaluatePilot(summary, weeks);
  const thisWeekReports = weeks[0]?.reports ?? 0;

  return (
    <div className="space-y-10">
      <Link href="/admin" className="inline-flex min-h-12 items-center underline">
        Back to reports
      </Link>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Targets</h2>
        <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {criteria.map((c, i) => (
            <TargetCard key={c.label} c={c} note={i === 1 ? `This week so far: ${thisWeekReports}` : c.detail} />
          ))}
        </ul>
        <p className="text-muted">
          {summary.total_signups} accounts in total. Alert emails stop at {EMAIL_DAILY_BUDGET} a day (Resend free plan).
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">By week</h2>
        <p className="text-muted">
          Weeks since launch, newest first. Weeks start Monday (Eastern). &ldquo;Got this too&rdquo; counts every press,
          including on alerts later hidden or removed; the target card counts only alerts that are still visible.
        </p>
        <WeeklyTable weeks={sinceLaunch(weeks)} />
      </div>
    </div>
  );
}

function TargetCard({ c, note }: { c: CriterionResult; note: string | null }) {
  const status = c.met === null ? "Not enough data" : c.met ? "Met" : "Not met";
  return (
    <li className="flex flex-col gap-2 rounded-xl border-2 border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-3xl font-bold tabular-nums">{c.value}</p>
        <span
          className={`text-2xl font-bold ${c.met === null ? "text-muted" : c.met ? "text-accent" : "text-danger"}`}
          aria-hidden
        >
          {criterionMark(c.met)}
        </span>
      </div>
      <h3 className="font-bold leading-snug">
        {c.label}
        <span className="sr-only">. {status}.</span>
      </h3>
      <div className="mt-auto space-y-1 pt-1">
        <p className="text-muted">Target {c.target}</p>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
    </li>
  );
}
