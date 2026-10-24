import type { ScamType } from "@/lib/scam-types";
import { isInformative, subjectInfo } from "./subjects";

export type TrendRow = {
  subject: string;
  this_week: number;
  last_week: number;
  week_ending: string;
  this_week_days: number;
  last_week_days: number;
};

export type Trend = {
  label: string;
  scamType: ScamType;
  tip: string;
  thisWeek: number;
  /** e.g. "up from 160 the week before"; null when there isn't a full prior week to compare. */
  change: string | null;
};

export type TrendSummary = {
  weekEnding: string;
  /** Days of data in the current window (7 once a full week is collected). */
  daysThisWeek: number;
  totalThisWeek: number;
  trends: Trend[];
};

const SAME_BAND = 0.1;

export function describeChange(thisWeek: number, lastWeek: number): string {
  if (lastWeek === 0) return thisWeek === 0 ? "none the week before" : "new this week";
  const ratio = (thisWeek - lastWeek) / lastWeek;
  if (Math.abs(ratio) <= SAME_BAND) return "about the same as the week before";
  return `${ratio > 0 ? "up" : "down"} from ${lastWeek} the week before`;
}

/** Top informative subjects this week. Rows for the same label are combined. */
export function buildTrends(rows: TrendRow[], max = 5): TrendSummary | null {
  if (rows.length === 0) return null;
  const { week_ending, this_week_days, last_week_days } = rows[0];
  const comparable = this_week_days >= 7 && last_week_days >= 7;

  const byLabel = new Map<string, { scamType: ScamType; tip: string; thisWeek: number; lastWeek: number }>();
  let totalThisWeek = 0;
  for (const row of rows) {
    totalThisWeek += row.this_week;
    if (!isInformative(row.subject)) continue;
    const { label, scamType, tip } = subjectInfo(row.subject);
    const entry = byLabel.get(label) ?? { scamType, tip, thisWeek: 0, lastWeek: 0 };
    entry.thisWeek += row.this_week;
    entry.lastWeek += row.last_week;
    byLabel.set(label, entry);
  }

  const trends = [...byLabel.entries()]
    .filter(([, e]) => e.thisWeek > 0)
    .sort((a, b) => b[1].thisWeek - a[1].thisWeek || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([label, e]) => ({
      label,
      scamType: e.scamType,
      tip: e.tip,
      thisWeek: e.thisWeek,
      change: comparable ? describeChange(e.thisWeek, e.lastWeek) : null,
    }));

  return { weekEnding: week_ending, daysThisWeek: this_week_days, totalThisWeek, trends };
}
