import { NextResponse, type NextRequest } from "next/server";
import { runDigest } from "@/lib/alerts/digest";
import { isCronRequest } from "@/lib/cron-auth";

export const maxDuration = 300;

// Called daily by Vercel Cron (vercel.json), which sends CRON_SECRET as a bearer token.
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) return new NextResponse("Unauthorized", { status: 401 });
  const result = await runDigest();
  console.log("digest", result);
  return NextResponse.json(result);
}
