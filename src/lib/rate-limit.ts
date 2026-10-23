import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Hashed client IP. Raw IPs are never stored. */
async function clientKey(): Promise<string> {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) throw new Error("Missing RATE_LIMIT_SALT. See README.md.");
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Records a hit for this client; false once it's over `limit` in the window. */
export async function allowRequest(name: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${name}:${await clientKey()}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Fail open: a rate limiter outage shouldn't take Check down.
    console.error("hit_rate_limit failed", error.message);
    return true;
  }
  return data === true;
}
