import "server-only";
import { flagEmail, renderAdminEmail, type AdminEmail } from "@/lib/email/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, sendAdminEmail } from "./send";

async function adminEmails(): Promise<string[]> {
  const { data } = await createAdminClient().rpc("admin_emails");
  return ((data as { email: string }[] | null) ?? []).map((e) => e.email);
}

export async function notifyAdminsOfFlag(reportId: string, reason: string, hidden: boolean) {
  const [to, { data: report }] = await Promise.all([
    adminEmails(),
    createAdminClient().from("reports").select("description_redacted").eq("id", reportId).maybeSingle(),
  ]);
  if (to.length === 0) return;
  const email = flagEmail(reason, hidden, report?.description_redacted ?? "", siteUrl());
  await sendAdminEmail(to, renderAdminEmail(siteUrl(), email), `flag-${reportId}-${reason}-${hidden ? "hidden" : "open"}`);
}

/** Operational email to every admin. `key` dedupes repeats (Resend idempotency, 24h). */
export async function notifyAdmins(email: AdminEmail, key: string) {
  const to = await adminEmails();
  if (to.length === 0) return;
  await sendAdminEmail(to, renderAdminEmail(siteUrl(), email), key);
}
