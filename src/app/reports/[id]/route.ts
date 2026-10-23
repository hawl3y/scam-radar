import { NextResponse, type NextRequest } from "next/server";
import { getReportCluster } from "@/lib/clusters";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Phase 1 links pointed at single reports; reports now live in clusters.
export async function GET(request: NextRequest, { params }: RouteContext<"/reports/[id]">) {
  const { id } = await params;
  const clusterId = UUID.test(id) ? await getReportCluster(id) : null;
  if (!clusterId) return new NextResponse("Not found", { status: 404 });

  const zip = request.nextUrl.searchParams.get("zip");
  const target = new URL(`/alerts/${clusterId}`, request.url);
  if (zip && /^[0-9]{5}$/.test(zip)) target.searchParams.set("zip", zip);
  return NextResponse.redirect(target, 308);
}
