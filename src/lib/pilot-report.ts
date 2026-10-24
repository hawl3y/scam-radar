import "server-only";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { siteUrl } from "@/lib/alerts/send";
import { evaluatePilot, type PilotSummary, type WeeklyMetrics } from "@/lib/pilot";
import { SITE_NAME } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getPilotMetrics(weeks = 8): Promise<{ summary: PilotSummary; weeks: WeeklyMetrics[] }> {
  const admin = createAdminClient();
  const [{ data: summary, error }, { data: weekly, error: weeklyError }] = await Promise.all([
    admin.rpc("pilot_summary"),
    admin.rpc("pilot_weekly_metrics", { p_weeks: weeks }),
  ]);
  if (error || weeklyError) throw new Error(`pilot metrics failed: ${(error ?? weeklyError)?.message}`);
  return { summary: (summary as PilotSummary[])[0], weeks: weekly as WeeklyMetrics[] };
}

/** Monday summary email to admins: last full week plus the success criteria. */
export async function sendWeeklyPilotEmail() {
  const { summary, weeks } = await getPilotMetrics(2);
  const last = weeks[1];
  if (!last) return;
  const lines = [
    `Week of ${last.week_start}`,
    `Sign-ups: ${last.signups} · Active users: ${last.active_users} (${last.returning_users} returning)`,
    `Reports: ${last.reports} · New alerts: ${last.new_clusters} · "Got this too": ${last.corroborations}`,
    `Checks: ${last.checks} · Feed views: ${last.feed_views} · Shares: ${last.shares}`,
    `Emails: ${last.instant_emails} instant, ${last.digest_emails} digest · Visits from email: ${last.email_visits} · Turned off emails: ${last.unsubscribes}`,
    `Flags: ${last.flags} · Removals: ${last.removals}`,
    "",
    "Pilot targets:",
    ...evaluatePilot(summary, weeks).map(
      (c) => `${c.met === null ? "·" : c.met ? "✓" : "✗"} ${c.label}: ${c.value} (target ${c.target})`,
    ),
    "",
    `${siteUrl()}/admin/metrics`,
  ];
  await notifyAdmins(`${SITE_NAME} weekly summary: week of ${last.week_start}`, lines.join("\n"), `weekly-${last.week_start}`);
}
