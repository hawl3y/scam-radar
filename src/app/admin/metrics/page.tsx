import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EMAIL_DAILY_BUDGET } from "@/lib/alerts/budget";
import { evaluatePilot, type WeeklyMetrics } from "@/lib/pilot";
import { getPilotMetrics } from "@/lib/pilot-report";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pilot metrics", robots: { index: false } };

const COLUMNS: [keyof WeeklyMetrics, string][] = [
  ["signups", "Sign-ups"],
  ["active_users", "Active users"],
  ["returning_users", "Returning"],
  ["reports", "Reports"],
  ["new_clusters", "New alerts"],
  ["corroborations", "Got this too"],
  ["checks", "Checks"],
  ["feed_views", "Feed views"],
  ["shares", "Shares"],
  ["instant_emails", "Instant emails"],
  ["digest_emails", "Digests"],
  ["email_visits", "Visits from email"],
  ["unsubscribes", "Emails off"],
  ["flags", "Flags"],
  ["removals", "Removals"],
];

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

  const { summary, weeks } = await getPilotMetrics(8);
  const criteria = evaluatePilot(summary, weeks);

  return (
    <div className="space-y-8">
      <Link href="/admin" className="inline-flex min-h-12 items-center underline">
        Back to reports
      </Link>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold">Targets</h2>
        <ul className="space-y-2">
          {criteria.map((c) => (
            <li key={c.label} className="flex flex-wrap items-baseline gap-x-3 rounded-md border-2 border-border p-3">
              <span aria-hidden className="text-lg">
                {c.met === null ? "·" : c.met ? "✓" : "✗"}
              </span>
              <span className="font-bold">{c.label}:</span>
              <span>{c.value}</span>
              <span className="text-muted">target {c.target}</span>
              <span className="sr-only">{c.met === null ? "not enough data" : c.met ? "met" : "not met"}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted">
          {summary.total_signups} accounts in total. Alert emails stop at {EMAIL_DAILY_BUDGET} a day (Resend free plan).
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold">By week</h2>
        <p className="text-muted">Weeks start Monday (Eastern). The top row is the current, partial week.</p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="border-b-2 border-border p-2">Week of</th>
                {COLUMNS.map(([key, label]) => (
                  <th key={key} scope="col" className="border-b-2 border-border p-2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week_start}>
                  <th scope="row" className="border-b border-border p-2 font-bold whitespace-nowrap">
                    {w.week_start}
                  </th>
                  {COLUMNS.map(([key]) => (
                    <td key={key} className="border-b border-border p-2">
                      {w[key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
