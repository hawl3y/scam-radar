import { NextResponse, type NextRequest } from "next/server";
import { notifyAdmins } from "@/lib/alerts/admin-notify";
import { easternDate } from "@/lib/alerts/policy";
import { isCronRequest } from "@/lib/cron-auth";
import { SITE_NAME } from "@/lib/site";
import { runIngest } from "@/lib/trending/ingest";

export const maxDuration = 300;

// Called daily by Vercel Cron (vercel.json) at 18:00 UTC, after the FTC's weekday update (~noon Eastern).
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return new NextResponse("Unauthorized", { status: 401 });
  const result = await runIngest();
  console.log("ingest", JSON.stringify(result));

  const dnc = result.dnc;
  const problems: string[] = [];
  if ("error" in dnc) problems.push(`FTC: ${dnc.error}`);
  else if (dnc.skipped) problems.push("FTC: FTC_API_KEY is missing");
  else {
    if (dnc.markets.days < dnc.markets.planned) {
      problems.push(
        `FTC markets: ${dnc.markets.days} of ${dnc.markets.planned} area-code days fetched` +
          (dnc.markets.rateLimited ? " (rate limited; the rest are retried next run)" : ""),
      );
    }
    if (dnc.states.failed > 0) problems.push(`FTC states: ${dnc.states.failed} state(s) failed`);
    // Partial coverage is normal when the shared quota runs out; recent days are refreshed
    // on the next runs. Only alert when most states were missed.
    if (dnc.states.statesComplete < dnc.states.totalStates / 2) {
      problems.push(
        `FTC states: only ${dnc.states.statesComplete} of ${dnc.states.totalStates} states completed` +
          (dnc.states.rateLimited ? " (rate limited)" : " (request budget reached)"),
      );
    }
  }
  if ("error" in result.ic3) problems.push(`FBI IC3: ${result.ic3.error}`);
  if (problems.length > 0) {
    await notifyAdmins(
      `${SITE_NAME} data import had problems`,
      problems.join("\n"),
      `ingest-${easternDate(new Date())}`,
    ).catch((e) => console.error("notify failed", e));
  }
  return NextResponse.json(result);
}
