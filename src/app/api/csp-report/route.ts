import { NextResponse, type NextRequest } from "next/server";

const MAX_BODY = 16_000;
const MAX_REPORTS = 10;

type Violation = { page: string; blocked: string; directive: string; source: string };

// Page URLs can carry email-link tokens, so log only origin and path.
function stripUrl(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return value.slice(0, 40); // "inline", "eval", "data", …
  }
}

function fromBody(b: Record<string, unknown>, legacy: boolean): Violation {
  const get = (modern: string, old: string) => b[legacy ? old : modern];
  const line = get("lineNumber", "line-number");
  const file = stripUrl(get("sourceFile", "source-file"));
  return {
    page: stripUrl(get("documentURL", "document-uri")),
    blocked: stripUrl(get("blockedURL", "blocked-uri")),
    directive: String(get("effectiveDirective", "effective-directive") ?? b["violated-directive"] ?? "").slice(0, 60),
    source: file ? `${file}${line ? `:${line}` : ""}` : "",
  };
}

// Browsers send either the Reporting API format (a list of reports) or the
// older report-uri format ({ "csp-report": { … } }).
function parse(body: unknown): Violation[] {
  if (Array.isArray(body)) {
    return body
      .filter((r) => r?.type === "csp-violation" && r.body && typeof r.body === "object")
      .slice(0, MAX_REPORTS)
      .map((r) => fromBody(r.body, false));
  }
  const legacy = (body as { "csp-report"?: unknown } | null)?.["csp-report"];
  return legacy && typeof legacy === "object" ? [fromBody(legacy as Record<string, unknown>, true)] : [];
}

export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > MAX_BODY) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  for (const v of parse(body)) console.warn("csp-violation", JSON.stringify(v));
  return new NextResponse(null, { status: 204 });
}
