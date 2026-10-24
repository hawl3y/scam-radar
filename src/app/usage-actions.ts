"use server";

import { recordUsage, type UsageMetric } from "@/lib/usage";

const CLIENT_METRICS = new Set<UsageMetric>(["feed_view", "share", "email_visit_digest", "email_visit_instant"]);

/** Anonymous page-level counts, sent from the browser (never during prerendering, and skips most bots). */
export async function recordClientUsage(metric: UsageMetric): Promise<void> {
  if (!CLIENT_METRICS.has(metric)) return;
  await recordUsage(metric);
}
