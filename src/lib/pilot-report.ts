import "server-only";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { siteUrl } from "@/lib/alerts/send";
import { weeklySummaryEmail } from "@/lib/email/admin";
import type { PilotSummary, WeeklyMetrics } from "@/lib/pilot";
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

export async function sendWeeklyPilotEmail() {
  const { summary, weeks } = await getPilotMetrics(2);
  const email = weeklySummaryEmail(summary, weeks, siteUrl());
  if (!email) return;
  await notifyAdmins(email, `weekly-${weeks[1].week_start}`);
}
