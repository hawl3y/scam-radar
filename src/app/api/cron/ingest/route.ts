import { NextResponse, type NextRequest } from "next/server";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { easternDate } from "@/lib/alerts/policy";
import { isCronRequest } from "@/lib/cron-auth";
import { SITE_NAME } from "@/lib/site";
import { runIngest } from "@/lib/trending/ingest";

export const maxDuration = 300;

// Called daily by Vercel Cron (vercel.json), before the digest.
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return new NextResponse("Unauthorized", { status: 401 });
  const result = await runIngest();
  console.log("ingest", JSON.stringify(result));

  const problems = [
    "error" in result.dnc ? `FTC: ${result.dnc.error}` : null,
    "failed" in result.dnc && result.dnc.failed > 0 ? `FTC: ${result.dnc.failed} day(s) failed (retried next run)` : null,
    "skipped" in result.dnc && result.dnc.skipped ? "FTC: FTC_API_KEY is missing" : null,
    "error" in result.ic3 ? `FBI IC3: ${result.ic3.error}` : null,
  ].filter(Boolean);
  if (problems.length > 0) {
    await notifyAdmins(
      `${SITE_NAME} data import had problems`,
      problems.join("\n"),
      `ingest-${easternDate(new Date())}`,
    ).catch((e) => console.error("notify failed", e));
  }
  return NextResponse.json(result);
}
