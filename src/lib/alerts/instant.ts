import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Channel, ScamType } from "@/lib/scam-types";
import { renderInstantEmail } from "./emails";
import { INSTANT_DAILY_LIMIT, isHot, underInstantLimit } from "./policy";
import { linksFor, sendAlertEmail } from "./send";

type Recipient = {
  user_id: string;
  email: string;
  home_zip: string | null;
  instant_last_24h: number;
  distance_miles: number;
  nearest_zip: string;
};

/**
 * Emails instant-mode neighbors when a cluster is past the threshold. Safe to
 * call repeatedly: each send is claimed in the database first.
 */
export async function sendInstantAlerts(clusterId: string): Promise<{ sent: number }> {
  const admin = createAdminClient();

  const [{ data: clusterRows, error }, { data: latestRows, error: latestError }, { data: signal, error: signalError }] =
    await Promise.all([
      admin.rpc("get_cluster", { p_cluster_id: clusterId }),
      admin.rpc("cluster_examples", { p_cluster_id: clusterId, max_results: 1 }),
      admin.rpc("cluster_alert_signal", { p_cluster_id: clusterId }),
    ]);
  const lookupError = error ?? latestError ?? signalError;
  if (lookupError) throw new Error(`cluster lookup failed: ${lookupError.message}`);
  const cluster = (clusterRows as { scam_type: ScamType; report_count: number; corroboration_count: number }[])[0];
  const latest = (latestRows as { description_redacted: string; channel: Channel }[])[0];
  if (!cluster || !latest || !isHot(Number(signal))) return { sent: 0 };

  const { data: recipients, error: recipientsError } = await admin.rpc("instant_alert_recipients", {
    p_cluster_id: clusterId,
  });
  if (recipientsError) throw new Error(`instant_alert_recipients failed: ${recipientsError.message}`);

  let sent = 0;
  for (const recipient of underInstantLimit(recipients as Recipient[])) {
    const { data: batchId, error: claimError } = await admin.rpc("claim_instant_alert", {
      p_user_id: recipient.user_id,
      p_cluster_id: clusterId,
      p_daily_limit: INSTANT_DAILY_LIMIT,
    });
    if (claimError) {
      console.error("claim_instant_alert failed", claimError.message);
      continue;
    }
    if (!batchId) continue;

    try {
      const links = linksFor(recipient.user_id, recipient.home_zip);
      const email = renderInstantEmail(
        {
          cluster_id: clusterId,
          scam_type: cluster.scam_type,
          report_count: cluster.report_count,
          corroboration_count: cluster.corroboration_count,
          distance_miles: recipient.distance_miles,
          nearest_zip: recipient.nearest_zip,
          latest_description: latest.description_redacted,
          latest_channel: latest.channel,
        },
        links,
      );
      await sendAlertEmail(recipient.email, email, links.unsubscribeUrl, `instant-${batchId}`);
      sent++;
    } catch (e) {
      console.error("instant alert send failed", e);
      await admin.rpc("release_alert_batch", { p_batch_id: batchId });
    }
  }
  return { sent };
}
