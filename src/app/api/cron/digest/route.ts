import { NextResponse, type NextRequest } from "next/server";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { runDigest } from "@/lib/alerts/digest";
import { easternDate } from "@/lib/alerts/policy";
import { isCronRequest } from "@/lib/cron-auth";
import { sendWeeklyPilotEmail } from "@/lib/pilot-report";
import { SITE_NAME } from "@/lib/site";
import { checkTrendCoverage } from "@/lib/trending/coverage";

export const maxDuration = 300;

// Called daily by Vercel Cron (vercel.json), which sends CRON_SECRET as a bearer token.
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return new NextResponse("Unauthorized", { status: 401 });
  const now = new Date();
  const today = easternDate(now);

  let result;
  try {
    result = await runDigest(now);
  } catch (e) {
    await notifyAdmins(`${SITE_NAME} digest failed`, String(e), `digest-error-${today}`).catch(() => {});
    throw e;
  }
  console.log("digest", result);
  if (result.failed > 0) {
    await notifyAdmins(
      `${SITE_NAME} digest had failures`,
      `${result.failed} digest email(s) failed today and will be retried tomorrow.\n\n${JSON.stringify(result)}`,
      `digest-failed-${today}`,
    ).catch((e) => console.error("notify failed", e));
  }

  // Monday (Eastern): weekly pilot summary for admins.
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(now);
  if (weekday === "Mon") await sendWeeklyPilotEmail().catch((e) => console.error("weekly summary failed", e));

  // Tue–Sat mornings: did yesterday's (weekday) ingest runs cover the markets and most states?
  if (["Tue", "Wed", "Thu", "Fri", "Sat"].includes(weekday)) {
    await checkTrendCoverage(today).catch((e) => console.error("coverage check failed", e));
  }

  return NextResponse.json(result);
}
