import Link from "next/link";
import { crowdLabel } from "@/lib/crowd";
import { formatDistance, formatTimeAgo } from "@/lib/format";
import { defang } from "@/lib/redaction";
import type { ClusterSummary } from "@/lib/clusters";
import { CHANNELS, scamTypeInfo } from "@/lib/scam-types";

export function ClusterCard({
  cluster,
  viewerZip,
  href,
  isNew = false,
}: {
  cluster: ClusterSummary;
  viewerZip: string | null;
  href: string;
  isNew?: boolean;
}) {
  const distance = formatDistance(cluster.distance_miles, viewerZip !== null && viewerZip === cluster.nearest_zip);
  const meta = [CHANNELS[cluster.latest_channel], distance, `last reported ${formatTimeAgo(new Date(cluster.last_seen))}`]
    .filter(Boolean)
    .join(" · ");
  return (
    <li>
      <Link href={href} className="block space-y-1 rounded-md border-2 border-border bg-surface p-3 hover:border-accent sm:p-4">
        <h3 className="text-lg font-bold">
          {isNew && (
            <span className="mr-2 rounded bg-accent px-2 py-0.5 text-base text-accent-foreground">New</span>
          )}
          {scamTypeInfo(cluster.scam_type).label}
        </h3>
        <p className="font-bold">{crowdLabel(cluster.report_count, cluster.corroboration_count)}</p>
        <p className="text-muted">{meta}</p>
        <p className="line-clamp-3 whitespace-pre-wrap break-words">{defang(cluster.latest_description)}</p>
      </Link>
    </li>
  );
}
