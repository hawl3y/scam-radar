import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

import type { UsageMetric } from "@/lib/usage-metrics";

export type { UsageMetric };

/** Aggregate daily count. Never fails the request it's called from. */
export async function recordUsage(metric: UsageMetric): Promise<void> {
  const { error } = await createAdminClient().rpc("bump_usage", { p_metric: metric });
  if (error) console.error("bump_usage failed", metric, error.message);
}
