import { NextResponse, type NextRequest } from "next/server";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { runDigest } from "@/lib/alerts/digest";
import { easternDate } from "@/lib/alerts/policy";
import { isCronRequest } from "@/lib/cron-auth";
import { paragraph, rows } from "@/lib/email/layout";
import { sendWeeklyPilotEmail } from "@/lib/pilot-report";
import { SITE_NAME } from "@/lib/site";
import { checkTrendCoverage } from "@/lib/trending/coverage";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return new NextResponse("Unauthorized", { status: 401 });
  const now = new Date();
  const today = easternDate(now);

  let result;
  try {
    result = await runDigest(now);
  } catch (e) {
    await notifyAdmins(
      {
        subject: `${SITE_NAME} digest failed`,
        heading: "The daily digest failed",
        blocks: [paragraph("No digest emails went out. The error:"), paragraph(String(e), undefined, { muted: true })],
      },
      `digest-error-${today}`,
    ).catch(() => {});
    throw e;
  }
  console.log("digest", result);
  if (result.failed > 0) {
    await notifyAdmins(
      {
        subject: `${SITE_NAME} digest had failures`,
        heading: "Some digest emails failed",
        blocks: [
          paragraph(`${result.failed} digest email${result.failed === 1 ? "" : "s"} failed today and will be retried tomorrow.`),
          rows([
            ["People due a digest", result.users],
            ["Sent", result.sent],
            ["Skipped", result.skipped],
            ["Failed", result.failed],
            ["Held by the daily limit", result.overBudget],
          ]),
        ],
      },
      `digest-failed-${today}`,
    ).catch((e) => console.error("notify failed", e));
  }

  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(now);
  if (weekday === "Mon") await sendWeeklyPilotEmail().catch((e) => console.error("weekly summary failed", e));

  // Tue–Sat: checks the previous weekday's ingest runs.
  if (["Tue", "Wed", "Thu", "Fri", "Sat"].includes(weekday)) {
    await checkTrendCoverage(today).catch((e) => console.error("coverage check failed", e));
  }

  return NextResponse.json(result);
}
