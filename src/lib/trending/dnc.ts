import { normalizeSubject } from "./subjects";

// FTC Do Not Call complaints → daily counts. Phone numbers and cities are
// dropped here and never stored (callers are often spoofed numbers).

export type DncRecord = {
  attributes: { subject?: string | null; "recorded-message-or-robocall"?: string | null } & Record<string, unknown>;
};

export type DncCount = { subject: string; robocall: boolean; complaints: number };

export function aggregateDnc(records: DncRecord[]): DncCount[] {
  const counts = new Map<string, DncCount>();
  for (const { attributes } of records) {
    const subject = normalizeSubject(attributes.subject) || "No Subject Provided";
    const robocall = String(attributes["recorded-message-or-robocall"] ?? "").toUpperCase() === "Y";
    const key = `${robocall}|${subject}`;
    const existing = counts.get(key);
    if (existing) existing.complaints++;
    else counts.set(key, { subject, robocall, complaints: 1 });
  }
  return [...counts.values()].sort((a, b) => b.complaints - a.complaints || a.subject.localeCompare(b.subject));
}

/** YYYY-MM-DD for `daysAgo` days before `today` (both calendar dates). */
export function shiftDate(today: string, daysAgo: number): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/**
 * Days to fetch per area code: anything missing in the last `windowDays`
 * (ending yesterday), plus the most recent `refreshDays` again since late
 * complaints can still arrive.
 */
export function daysToFetch(
  today: string,
  areaCodes: string[],
  ingested: { area_code: string; day: string }[],
  windowDays = 14,
  refreshDays = 2,
): { areaCode: string; day: string }[] {
  const have = new Set(ingested.map((d) => `${d.area_code}|${d.day}`));
  const result: { areaCode: string; day: string }[] = [];
  for (const areaCode of areaCodes) {
    for (let ago = 1; ago <= windowDays; ago++) {
      const day = shiftDate(today, ago);
      if (ago <= refreshDays || !have.has(`${areaCode}|${day}`)) result.push({ areaCode, day });
    }
  }
  return result;
}

/** YYYY-MM-DD from an FTC created-date ("2026-10-21 13:45:12"); null if malformed. */
export function recordDay(record: DncRecord): string | null {
  const value = String(record.attributes["created-date"] ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

/** Keep only complaints whose consumer-state matches (blank states are dropped). */
export function fromState(records: DncRecord[], stateFullName: string): DncRecord[] {
  const want = stateFullName.toLowerCase();
  return records.filter((r) => String(r.attributes["consumer-state"] ?? "").trim().toLowerCase() === want);
}

/**
 * Per-state streams come back newest first. After reading some pages, a day is
 * complete if we've seen anything older than it, or reached the end of the data.
 * Returns the days in [fromDay, toDay] that are complete.
 */
export function completeDays(fromDay: string, toDay: string, oldestSeen: string | null, reachedEnd: boolean): string[] {
  const days: string[] = [];
  for (let d = toDay; d >= fromDay; d = shiftDate(d, 1)) {
    if (reachedEnd || (oldestSeen !== null && d > oldestSeen)) days.push(d);
  }
  return days;
}

/** Group records by created day, keeping days within [fromDay, toDay]. */
export function bucketByDay(records: DncRecord[], fromDay: string, toDay: string): Map<string, DncRecord[]> {
  const byDay = new Map<string, DncRecord[]>();
  for (const record of records) {
    const day = recordDay(record);
    if (!day || day < fromDay || day > toDay) continue;
    const list = byDay.get(day) ?? [];
    list.push(record);
    byDay.set(day, list);
  }
  return byDay;
}
