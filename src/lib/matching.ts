// Matching thresholds and decisions. Scores come from database functions
// (pg_trgm similarity today, 0–1). To switch to embeddings later, change the
// functions in supabase/migrations and re-tune these numbers.
//
// Calibrated with scripts/calibrate-matching.mts against dev (2026-10-24):
//   same scam, both pasted:     0.545–0.786
//   same scam, own words:       0.137–0.552
//   different scams:            max 0.306 (90th percentile 0.171)

/** A new report joins an existing cluster at or above this score. */
export const JOIN_THRESHOLD = 0.45;

/** Check shows a cluster as a match at or above this score. */
export const CHECK_MATCH_THRESHOLD = 0.32;

/** Only clusters with a report within this distance can be joined. */
export const CLUSTER_MAX_MILES = 50;

/** Clusters with no new reports for this long aren't joined; a new one starts. */
export const CLUSTER_ACTIVE_DAYS = 90;

/** Check looks for matches within this distance of the viewer's zip. */
export const CHECK_RADIUS_MILES = 50;

export type ClusterCandidate = { cluster_id: string; score: number } | null;

/** Cluster to join, or null to start a new one. */
export function chooseCluster(candidate: ClusterCandidate): string | null {
  if (!candidate || !Number.isFinite(candidate.score)) return null;
  return candidate.score >= JOIN_THRESHOLD ? candidate.cluster_id : null;
}

/** Keep Check results that are close enough to show, best first. */
export function checkMatches<T extends { score: number }>(candidates: T[]): T[] {
  return candidates
    .filter((c) => Number.isFinite(c.score) && c.score >= CHECK_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}
