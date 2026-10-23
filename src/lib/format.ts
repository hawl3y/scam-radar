/** "In your zip", "0.4 mi away", "12 mi away". Null when there's no viewer location. */
export function formatDistance(miles: number | null, sameZip: boolean): string | null {
  if (sameZip) return "In your zip";
  if (miles === null || !Number.isFinite(miles)) return null;
  if (miles < 10) return `${Math.max(miles, 0.1).toFixed(1)} mi away`;
  return `${Math.round(miles)} mi away`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return "just now";
}
