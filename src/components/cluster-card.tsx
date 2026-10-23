import Link from "next/link";
import { formatDistance, formatTimeAgo } from "@/lib/format";
import { defang } from "@/lib/redaction";
import type { ClusterSummary } from "@/lib/clusters";
import { CHANNELS, SCAM_TYPES } from "@/lib/scam-types";

/** "Reported by 3 neighbors · 5 got this too" — describes the crowd, never a verdict. */
export function crowdLabel(reportCount: number, corroborationCount: number): string {
  const reported = `Reported by ${reportCount} ${reportCount === 1 ? "neighbor" : "neighbors"}`;
  return corroborationCount > 0 ? `${reported} · ${corroborationCount} got this too` : reported;
}

export function ClusterCard({
  cluster,
  viewerZip,
  href,
}: {
  cluster: ClusterSummary;
  viewerZip: string | null;
  href: string;
}) {
  const distance = formatDistance(cluster.distance_miles, viewerZip !== null && viewerZip === cluster.nearest_zip);
  const meta = [CHANNELS[cluster.latest_channel], distance, `last reported ${formatTimeAgo(new Date(cluster.last_seen))}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <Link href={href} className="block space-y-1 rounded-md border-2 border-border p-4 hover:border-accent">
        <h3 className="text-lg font-bold">{SCAM_TYPES[cluster.scam_type].label}</h3>
        <p className="font-bold">{crowdLabel(cluster.report_count, cluster.corroboration_count)}</p>
        <p className="text-muted">{meta}</p>
        <p className="line-clamp-3 whitespace-pre-wrap break-words">{defang(cluster.latest_description)}</p>
      </Link>
    </li>
  );
}
