"use server";

import { z } from "zod";
import { profileSettingsSchema } from "@/lib/profile-schema";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { ok?: boolean; errors?: Record<string, string[] | undefined> };

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = profileSettingsSchema.safeParse({
    homeZip: formData.get("homeZip"),
    radiusMiles: formData.get("radiusMiles"),
    alertMode: formData.get("alertMode"),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) {
    return { errors: { form: ["Your session ended. Please sign in again."] } };
  }

  const { data: known } = await supabase
    .from("zip_centroids")
    .select("zip")
    .eq("zip", parsed.data.homeZip)
    .maybeSingle();
  if (!known) {
    return { errors: { homeZip: ["We don't recognize that zip code. Please check it."] } };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      home_zip: parsed.data.homeZip,
      radius_miles: parsed.data.radiusMiles,
      alert_mode: parsed.data.alertMode,
    })
    .eq("id", userId);
  if (error) {
    console.error("profile update failed", error.message);
    return { errors: { form: ["We couldn't save your settings. Please try again."] } };
  }
  return { ok: true };
}
