import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Email sign-in shared by the login page and the in-flow sign-in on /report.

export const emailSchema = z.email();
export const codeSchema = z.string().regex(/^[0-9]{6,10}$/);

/** Sends the sign-in email (link + code). Returns an error message, or null on success. */
export async function sendSignInEmail(email: string): Promise<string | null> {
  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // The email template appends ?token_hash=…&type=email to this URL.
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (!error) return null;
  console.error("signInWithOtp failed", error.message);
  return error.status === 429
    ? "Too many sign-in emails were sent. Please wait a few minutes and try again."
    : "We couldn't send the email. Please try again.";
}

/** Verifies the 6-digit code. Works for first-time and returning emails. Returns an error message, or null. */
export async function verifySignInCode(email: string, rawCode: string): Promise<string | null> {
  const code = codeSchema.safeParse(rawCode.replace(/\s/g, ""));
  if (!code.success) return "Enter the code from the email, numbers only.";
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  return error ? "That code didn't work. It may have expired. Try again or request a new email." : null;
}
