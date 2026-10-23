import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const ALERT_MODES = ["digest", "instant", "off"] as const;
export type AlertMode = (typeof ALERT_MODES)[number];


export async function getAlertMode(userId: string): Promise<AlertMode | null> {
  const { data } = await createAdminClient().from("profiles").select("alert_mode").eq("id", userId).maybeSingle();
  return (data?.alert_mode as AlertMode | undefined) ?? null;
}

export async function setAlertMode(userId: string, mode: AlertMode): Promise<boolean> {
  const { error } = await createAdminClient().from("profiles").update({ alert_mode: mode }).eq("id", userId);
  if (error) console.error("setAlertMode failed", error.message);
  return !error;
}
