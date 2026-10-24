import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { alertEmailsRemaining, warnBudgetReached } from "./budget";
import { renderDigestEmail, type EmailCluster } from "./emails";
import { DIGEST_WINDOW_HOURS, easternDate, groupDigest } from "./policy";
import { linksFor, sendAlertEmail } from "./send";

type DigestRow = EmailCluster & { user_id: string; email: string; home_zip: string | null; last_seen: string };

/** Sends today's digests. Safe to re-run: at most one digest per person per Eastern day. */
export async function runDigest(
  now = new Date(),
): Promise<{ users: number; sent: number; skipped: number; failed: number; overBudget: number }> {
  const admin = createAdminClient();
  const since = new Date(now.getTime() - DIGEST_WINDOW_HOURS * 3600 * 1000).toISOString();
  const { data, error } = await admin.rpc("digest_candidates", { p_since: since });
  if (error) throw new Error(`digest_candidates failed: ${error.message}`);

  const digestDate = easternDate(now);
  const groups = groupDigest(data as DigestRow[]);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let overBudget = 0;
  let remaining = await alertEmailsRemaining();

  for (const { userId, items, totalItems } of groups) {
    if (remaining <= 0) {
      overBudget++;
      continue;
    }
    const { data: batchId, error: claimError } = await admin.rpc("claim_digest", {
      p_user_id: userId,
      p_digest_date: digestDate,
      p_cluster_ids: items.map((i) => i.cluster_id),
    });
    if (claimError) {
      console.error("claim_digest failed", claimError.message);
      failed++;
      continue;
    }
    if (!batchId) {
      skipped++;
      continue;
    }

    try {
      const links = linksFor(userId, items[0].home_zip);
      await sendAlertEmail(items[0].email, renderDigestEmail(items, totalItems, links), links.unsubscribeUrl, `digest-${batchId}`);
      sent++;
      remaining--;
    } catch (e) {
      console.error("digest send failed", e);
      await admin.rpc("release_alert_batch", { p_batch_id: batchId });
      failed++;
    }
  }
  if (overBudget > 0) await warnBudgetReached(overBudget, "digest");
  return { users: groups.length, sent, skipped, failed, overBudget };
}
