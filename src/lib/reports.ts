import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RADIUS } from "@/lib/profile-schema";
import type { Channel, ScamType } from "@/lib/scam-types";

export type PublicReport = {
  id: string;
  scam_type: ScamType;
  channel: Channel;
  description_redacted: string;
  zip: string;
  created_at: string;
  distance_miles: number | null;
};

export type Viewer =
  | { kind: "located"; zip: string; radiusMiles: number; signedIn: boolean }
  | { kind: "needs-zip"; signedIn: boolean; unknownZip?: string };

/** Signed-in viewers use their profile; others pass ?zip= in the URL. */
export async function getViewer(zipParam: string | string[] | undefined): Promise<Viewer> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (auth?.claims) {
    const { data: profile } = await supabase.from("profiles").select("home_zip, radius_miles").maybeSingle();
    if (profile?.home_zip) {
      return { kind: "located", zip: profile.home_zip, radiusMiles: profile.radius_miles, signedIn: true };
    }
    return { kind: "needs-zip", signedIn: true };
  }

  const zip = typeof zipParam === "string" ? zipParam.trim() : "";
  if (!/^[0-9]{5}$/.test(zip)) return { kind: "needs-zip", signedIn: false, unknownZip: zip || undefined };

  const { data } = await supabase.from("zip_centroids").select("zip").eq("zip", zip).maybeSingle();
  if (!data) return { kind: "needs-zip", signedIn: false, unknownZip: zip };
  return { kind: "located", zip, radiusMiles: DEFAULT_RADIUS, signedIn: false };
}

export async function getNearbyReports(zip: string, radiusMiles: number): Promise<PublicReport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nearby_reports", { origin_zip: zip, radius_miles: radiusMiles });
  if (error) throw new Error(`nearby_reports failed: ${error.message}`);
  return data as PublicReport[];
}

export async function getReport(id: string, originZip: string | null): Promise<PublicReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_report", { report_id: id, origin_zip: originZip });
  if (error) throw new Error(`get_report failed: ${error.message}`);
  return (data as PublicReport[])[0] ?? null;
}
