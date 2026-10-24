import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatTimeAgo } from "@/lib/format";
import { defang } from "@/lib/redaction";
import { CHANNELS, SCAM_TYPES, type Channel, type ScamType } from "@/lib/scam-types";
import { createClient } from "@/lib/supabase/server";
import { AdminReportActions } from "./report-actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const VIEWS = {
  flagged: "Flagged",
  limited: "From limited accounts",
  removed: "Removed",
} as const;
type View = keyof typeof VIEWS;

const REASON_LABELS: Record<string, string> = {
  personal_info: "Shares personal info",
  private_person: "Names a private person",
  not_a_scam: "Not a scam",
  spam: "Spam or fake",
  other: "Something else",
};

type AdminReport = {
  report_id: string;
  cluster_id: string | null;
  scam_type: ScamType;
  channel: Channel;
  description_redacted: string;
  zip: string;
  status: "active" | "hidden" | "removed";
  created_at: string;
  status_changed_at: string | null;
  reporter_reputation: number;
  open_flags: number;
  reasons: string[] | null;
  notes: string[] | null;
};

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Admin</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <Admin searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Admin({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) notFound();

  const { view: viewParam } = await searchParams;
  const view: View = typeof viewParam === "string" && viewParam in VIEWS ? (viewParam as View) : "flagged";
  const { data, error } = await supabase.rpc("admin_reports", { p_view: view });
  if (error) throw new Error(`admin_reports failed: ${error.message}`);
  const reports = data as AdminReport[];

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-3" aria-label="Admin views">
        {(Object.entries(VIEWS) as [View, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin?view=${key}`}
            aria-current={key === view ? "page" : undefined}
            className={`inline-flex min-h-12 items-center rounded-md border-2 px-4 font-bold ${
              key === view ? "border-accent" : "border-border"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p>Nothing here.</p>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li key={r.report_id} className="space-y-2 rounded-md border-2 border-border p-4">
              <p className="font-bold">
                {SCAM_TYPES[r.scam_type].label}
                {r.status !== "active" && (
                  <span className="ml-2 rounded bg-foreground/10 px-2 py-0.5 text-base">{r.status}</span>
                )}
              </p>
              <p className="text-muted">
                {CHANNELS[r.channel]} · {r.zip} · posted {formatTimeAgo(new Date(r.created_at))} · reporter reputation{" "}
                {r.reporter_reputation}
              </p>
              <blockquote className="whitespace-pre-wrap break-words rounded-md bg-foreground/5 p-3">
                {defang(r.description_redacted)}
              </blockquote>
              {r.open_flags > 0 && (
                <div>
                  <p className="font-bold">
                    {r.open_flags} open {r.open_flags === 1 ? "flag" : "flags"}:{" "}
                    {(r.reasons ?? []).map((reason) => REASON_LABELS[reason] ?? reason).join(", ")}
                  </p>
                  {(r.notes ?? []).map((note, i) => (
                    <p key={i} className="text-muted">
                      “{defang(note)}”
                    </p>
                  ))}
                </div>
              )}
              {r.status === "active" && r.cluster_id && (
                <Link href={`/alerts/${r.cluster_id}`} className="inline-flex min-h-12 items-center underline">
                  View alert
                </Link>
              )}
              <AdminReportActions
                reportId={r.report_id}
                actions={
                  r.status === "removed"
                    ? [{ status: "active", label: "Restore" }]
                    : [
                        { status: "removed", label: "Remove", primary: true },
                        ...(r.open_flags > 0 || r.status === "hidden"
                          ? [{ status: "active" as const, label: r.status === "hidden" ? "Restore and dismiss flags" : "Dismiss flags" }]
                          : []),
                      ]
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
