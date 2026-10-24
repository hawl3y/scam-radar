import "server-only";
import { defang } from "@/lib/redaction";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl, sendPlainEmail } from "./send";

const REASON_LABELS: Record<string, string> = {
  personal_info: "Shares personal info",
  private_person: "Names a private person",
  not_a_scam: "Not a scam",
  spam: "Spam or fake",
  other: "Something else",
};

/** Tell the owner a report was flagged (and whether it's now auto-hidden). */
export async function notifyAdminsOfFlag(reportId: string, reason: string, hidden: boolean) {
  const admin = createAdminClient();
  const [{ data: emails }, { data: report }] = await Promise.all([
    admin.rpc("admin_emails"),
    admin.from("reports").select("description_redacted").eq("id", reportId).maybeSingle(),
  ]);
  const to = ((emails as { email: string }[] | null) ?? []).map((e) => e.email);
  if (to.length === 0) return;

  const subject = hidden ? "A report was auto-hidden after 3 flags" : "A report was flagged";
  const text = [
    `Reason: ${REASON_LABELS[reason] ?? reason}`,
    hidden ? "It's hidden until you review it." : "It's still visible.",
    "",
    defang(report?.description_redacted ?? "").slice(0, 500),
    "",
    `Review: ${siteUrl()}/admin`,
  ].join("\n");
  await sendPlainEmail(to, subject, text, `flag-${reportId}-${reason}-${hidden ? "hidden" : "open"}`);
}

/** Operational email to every admin. `key` dedupes repeats (Resend idempotency, 24h). */
export async function notifyAdmins(subject: string, text: string, key: string) {
  const { data } = await createAdminClient().rpc("admin_emails");
  const to = ((data as { email: string }[] | null) ?? []).map((e) => e.email);
  if (to.length === 0) return;
  await sendPlainEmail(to, subject, text, key);
}
