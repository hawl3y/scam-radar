import "server-only";
import {
  CHECK_RADIUS_MILES,
  CLUSTER_ACTIVE_DAYS,
  CLUSTER_MAX_MILES,
  checkMatches,
  chooseCluster,
  type ClusterCandidate,
} from "@/lib/matching";
import type { Channel, ScamType } from "@/lib/scam-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ClusterSummary = {
  cluster_id: string;
  scam_type: ScamType;
  report_count: number;
  corroboration_count: number;
  last_seen: string;
  distance_miles: number | null;
  nearest_zip: string | null;
  latest_description: string;
  latest_channel: Channel;
};

export type ClusterMatch = ClusterSummary & { score: number };

export type ClusterDetail = {
  cluster_id: string;
  scam_type: ScamType;
  report_count: number;
  corroboration_count: number;
  first_seen: string;
  last_seen: string;
  distance_miles: number | null;
  nearest_zip: string | null;
};

export type ClusterExample = {
  id: string;
  channel: Channel;
  description_redacted: string;
  zip: string;
  created_at: string;
};

/** Put a newly inserted report into the best matching cluster, or a new one. */
export async function assignCluster(reportId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: candidates, error } = await admin.rpc("nearest_cluster_candidate", {
    p_report_id: reportId,
    p_max_miles: CLUSTER_MAX_MILES,
    p_active_days: CLUSTER_ACTIVE_DAYS,
  });
  if (error) console.error("nearest_cluster_candidate failed", error.message);

  const clusterId = chooseCluster(((candidates as ClusterCandidate[] | null) ?? [])[0] ?? null);
  const { data, error: attachError } = await admin.rpc("attach_report_to_cluster", {
    p_report_id: reportId,
    p_cluster_id: clusterId,
  });
  if (attachError || !data) throw new Error(`attach_report_to_cluster failed: ${attachError?.message}`);
  return data as string;
}

export async function getNearbyClusters(zip: string, radiusMiles: number): Promise<ClusterSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nearby_clusters", { origin_zip: zip, radius_miles: radiusMiles });
  if (error) throw new Error(`nearby_clusters failed: ${error.message}`);
  return data as ClusterSummary[];
}

export async function getCluster(id: string, originZip: string | null): Promise<ClusterDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_cluster", { p_cluster_id: id, origin_zip: originZip });
  if (error) throw new Error(`get_cluster failed: ${error.message}`);
  return (data as ClusterDetail[])[0] ?? null;
}

export async function getClusterExamples(id: string): Promise<ClusterExample[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cluster_examples", { p_cluster_id: id, max_results: 5 });
  if (error) throw new Error(`cluster_examples failed: ${error.message}`);
  return data as ClusterExample[];
}

export async function getReportCluster(reportId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("report_cluster", { p_report_id: reportId });
  if (error) throw new Error(`report_cluster failed: ${error.message}`);
  return (data as string | null) ?? null;
}

/** Signed-in viewer's relationship to a cluster; null when signed out. */
export async function getMyClusterStatus(id: string): Promise<{ reported: boolean; corroborated: boolean } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return null;
  const { data, error } = await supabase.rpc("my_cluster_status", { p_cluster_id: id });
  if (error) throw new Error(`my_cluster_status failed: ${error.message}`);
  return (data as { reported: boolean; corroborated: boolean }[])[0] ?? { reported: false, corroborated: false };
}

/** Clusters similar to pasted text. zip null searches everywhere. */
export async function findMatchingClusters(redactedText: string, zip: string | null): Promise<ClusterMatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_clusters", {
    query: redactedText,
    origin_zip: zip,
    radius_miles: CHECK_RADIUS_MILES,
    max_results: 5,
  });
  if (error) throw new Error(`match_clusters failed: ${error.message}`);
  return checkMatches(data as ClusterMatch[]).slice(0, 3);
}
