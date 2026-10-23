import Link from "next/link";
import { formatDistance, formatTimeAgo } from "@/lib/format";
import { defang } from "@/lib/redaction";
import type { PublicReport } from "@/lib/reports";
import { CHANNELS, SCAM_TYPES } from "@/lib/scam-types";

export function ReportMeta({ report, viewerZip }: { report: PublicReport; viewerZip: string | null }) {
  const distance = formatDistance(report.distance_miles, viewerZip === report.zip);
  return (
    <p className="text-muted">
      {[CHANNELS[report.channel], distance, formatTimeAgo(new Date(report.created_at))].filter(Boolean).join(" · ")}
    </p>
  );
}

export function ReportCard({ report, viewerZip, href }: { report: PublicReport; viewerZip: string; href: string }) {
  return (
    <li>
      <Link href={href} className="block space-y-1 rounded-md border-2 border-border p-4 hover:border-accent">
        <h3 className="text-lg font-bold">{SCAM_TYPES[report.scam_type].label}</h3>
        <ReportMeta report={report} viewerZip={viewerZip} />
        <p className="line-clamp-3 whitespace-pre-wrap break-words">{defang(report.description_redacted)}</p>
      </Link>
    </li>
  );
}
