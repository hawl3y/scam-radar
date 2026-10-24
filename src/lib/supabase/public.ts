import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Cookie-free client for public reads that can be cached (e.g. link previews). */
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
