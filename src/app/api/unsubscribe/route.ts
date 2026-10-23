import { NextResponse, type NextRequest } from "next/server";
import { setAlertMode } from "@/lib/alerts/preferences";
import { verifyPrefsToken } from "@/lib/alerts/tokens";

// One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header.
export async function POST(request: NextRequest) {
  const userId = verifyPrefsToken(request.nextUrl.searchParams.get("token"));
  if (!userId) return new NextResponse("Invalid link", { status: 400 });
  if (!(await setAlertMode(userId, "off"))) return new NextResponse("Try again later", { status: 500 });
  return new NextResponse("You won't get any more alert emails.", { status: 200 });
}

// Opening the link in a browser shows the preferences page. GET never changes
// anything, because link scanners fetch URLs in emails.
export async function GET(request: NextRequest) {
  const target = new URL("/email-preferences", request.url);
  const token = request.nextUrl.searchParams.get("token");
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target, 303);
}
