import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import type { RateLimit } from "@/lib/rate-limits";
import { createAdminClient } from "@/lib/supabase/admin";

function hashKey(subject: string): string {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) throw new Error("Missing RATE_LIMIT_SALT. See README.md.");
  return createHash("sha256").update(`${salt}:${subject}`).digest("hex");
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/**
 * Records a hit and returns false once over the limit. Keyed by user id when
 * given, otherwise by client IP. Raw ids and IPs are never stored.
 */
export async function allowRequest(limit: RateLimit, userId?: string): Promise<boolean> {
  const subject = userId ? `user:${userId}` : `ip:${await clientIp()}`;
  const { data, error } = await createAdminClient().rpc("hit_rate_limit", {
    p_key: `${limit.name}:${hashKey(subject)}`,
    p_limit: limit.limit,
    p_window_seconds: limit.windowSeconds,
  });
  if (error) {
    // Fail open: a rate limiter outage shouldn't take the app down.
    console.error("hit_rate_limit failed", error.message);
    return true;
  }
  return data === true;
}
