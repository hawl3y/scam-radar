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
