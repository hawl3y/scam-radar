import "server-only";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

/** Where to send someone right after they sign in. */
export async function postLoginPath(next: string | null | undefined): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("home_zip").maybeSingle();
  if (!data?.home_zip) return "/settings?welcome=1";
  return safeNext(next);
}
