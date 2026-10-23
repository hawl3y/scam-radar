// Alert rules (brief §8 Phase 3). Pure functions; the database enforces the
// same limits atomically when a send is claimed.

const envThreshold = Number(process.env.ALERT_INSTANT_THRESHOLD);

/** Reports + "got this too" at which a cluster triggers instant emails. */
export const INSTANT_THRESHOLD = Number.isInteger(envThreshold) && envThreshold > 0 ? envThreshold : 3;

/** Max instant emails per person in 24 hours. Extra clusters go in the digest. */
export const INSTANT_DAILY_LIMIT = 3;

/** Digest covers clusters active in this window (a bit over a day, for cron timing drift). */
export const DIGEST_WINDOW_HOURS = 36;

/** Max clusters listed in one digest. */
export const DIGEST_MAX_ITEMS = 10;

export function isHot(reportCount: number, corroborationCount: number, threshold = INSTANT_THRESHOLD): boolean {
  return reportCount + corroborationCount >= threshold;
}

/** Recipients still under the daily instant limit. */
export function underInstantLimit<T extends { instant_last_24h: number }>(recipients: T[], limit = INSTANT_DAILY_LIMIT): T[] {
  return recipients.filter((r) => r.instant_last_24h < limit);
}

/** Calendar date in Eastern time (YYYY-MM-DD), used to allow one digest per day. */
export function easternDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Group digest rows by user, keeping each user's newest clusters first. */
export function groupDigest<T extends { user_id: string; last_seen: string }>(rows: T[], maxItems = DIGEST_MAX_ITEMS) {
  const byUser = new Map<string, T[]>();
  for (const row of rows) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }
  return [...byUser.entries()].map(([userId, items]) => ({
    userId,
    items: items.sort((a, b) => Date.parse(b.last_seen) - Date.parse(a.last_seen)).slice(0, maxItems),
    totalItems: items.length,
  }));
}
