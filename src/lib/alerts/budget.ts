import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAdmins } from "./admin-notify";
import { easternDate } from "./policy";
import { SITE_NAME } from "@/lib/site";
import { siteUrl } from "./send";

// Resend's free plan allows 100 emails a day, and sign-in emails count too.
// Alerts stop at this budget so sign-in keeps working; extra clusters roll
// into a later digest. Raise it after upgrading Resend.
const envBudget = Number(process.env.EMAIL_DAILY_BUDGET);
export const EMAIL_DAILY_BUDGET = Number.isInteger(envBudget) && envBudget > 0 ? envBudget : 90;

/** Alert emails still allowed today (Eastern). */
export async function alertEmailsRemaining(): Promise<number> {
  const { data, error } = await createAdminClient().rpc("alert_emails_sent_today");
  if (error) {
    console.error("alert_emails_sent_today failed", error.message);
    return EMAIL_DAILY_BUDGET; // Don't block alerts on a metrics failure.
  }
  return Math.max(0, EMAIL_DAILY_BUDGET - Number(data ?? 0));
}

/** Tell admins (once a day) that alerts were held back by the budget. */
export async function warnBudgetReached(skipped: number, kind: "digest" | "instant") {
  const today = easternDate(new Date());
  await notifyAdmins(
    `${SITE_NAME} hit its daily email limit`,
    [
      `${skipped} ${kind} email${skipped === 1 ? "" : "s"} weren't sent today because alerts reached the daily budget of ${EMAIL_DAILY_BUDGET}.`,
      "",
      "Resend's free plan allows 100 emails a day, including sign-in emails.",
      "To send more, upgrade Resend and raise EMAIL_DAILY_BUDGET in Vercel.",
      "",
      `${siteUrl()}/admin/metrics`,
    ].join("\n"),
    `budget-${kind}-${today}`,
  ).catch((e) => console.error("budget warning failed", e));
}
