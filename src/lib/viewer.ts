import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RADIUS } from "@/lib/profile-schema";

export type Viewer =
  | { kind: "located"; zip: string; radiusMiles: number; signedIn: boolean; lastFeedVisit: string | null }
  | { kind: "needs-zip"; signedIn: boolean; unknownZip?: string };

/** Signed-in viewers use their profile; others pass ?zip= in the URL. */
export async function getViewer(zipParam: string | string[] | undefined): Promise<Viewer> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();

  if (auth?.claims) {
    const { data: profile } = await supabase.from("profiles").select("home_zip, radius_miles, last_feed_visit_at").maybeSingle();
    if (profile?.home_zip) {
      return {
        kind: "located",
        zip: profile.home_zip,
        radiusMiles: profile.radius_miles,
        signedIn: true,
        lastFeedVisit: profile.last_feed_visit_at,
      };
    }
    return { kind: "needs-zip", signedIn: true };
  }

  const zip = typeof zipParam === "string" ? zipParam.trim() : "";
  if (!/^[0-9]{5}$/.test(zip)) return { kind: "needs-zip", signedIn: false, unknownZip: zip || undefined };

  const { data } = await supabase.from("zip_centroids").select("zip").eq("zip", zip).maybeSingle();
  if (!data) return { kind: "needs-zip", signedIn: false, unknownZip: zip };
  return { kind: "located", zip, radiusMiles: DEFAULT_RADIUS, signedIn: false, lastFeedVisit: null };
}
