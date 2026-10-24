import "server-only";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { SITE_NAME } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_FRESH_STATES = 40;

/**
 * Once a day (digest cron, Tue–Sat mornings, after the previous weekday's
 * ingest runs): email admins if market area codes or many states weren't fetched.
 */
export async function checkTrendCoverage(today: string) {
  const { data, error } = await createAdminClient().rpc("dnc_coverage", { p_hours: 26 });
  if (error) throw new Error(`dnc_coverage failed: ${error.message}`);
  const row = (data as { states_fresh: number; market_codes_stale: string[] }[])[0];
  if (!row) return;
  const problems = [
    row.market_codes_stale.length > 0 ? `Market area codes not fetched in the last day: ${row.market_codes_stale.join(", ")}` : null,
    row.states_fresh < MIN_FRESH_STATES ? `Only ${row.states_fresh} of 52 states fetched in the last day (expected ${MIN_FRESH_STATES}+)` : null,
  ].filter(Boolean);
  if (problems.length === 0) return;
  await notifyAdmins(
    `${SITE_NAME} trend data is behind`,
    [...problems, "", "Check the Ingest FTC data workflow runs on GitHub and the Vercel cron logs."].join("\n"),
    `coverage-${today}`,
  );
}
