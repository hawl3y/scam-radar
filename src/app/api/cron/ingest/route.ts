import { NextResponse, type NextRequest } from "next/server";
import { isCronRequest } from "@/lib/cron-auth";
import { runIngest } from "@/lib/trending/ingest";

export const maxDuration = 300;

// Called daily by Vercel Cron (vercel.json), before the digest.
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return new NextResponse("Unauthorized", { status: 401 });
  const result = await runIngest();
  console.log("ingest", JSON.stringify(result));
  return NextResponse.json(result);
}
