"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { postLoginPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// In the "code" step, email is null when we don't know it yet (e.g. arriving
// from a sign-in link that didn't work); the form then asks for it.
export type LoginState =
  | { step: "email"; error?: string }
  | { step: "code"; email: string | null; error?: string };

const emailSchema = z.email();
const codeSchema = z.string().regex(/^[0-9]{6,10}$/);

async function sendLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) {
    return { step: "email", error: "Please enter a valid email address." };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      // The email template appends ?token_hash=…&type=email to this URL.
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    console.error("signInWithOtp failed", error.message);
    return {
      step: "email",
      error:
        error.status === 429
          ? "Too many sign-in emails were sent. Please wait a few minutes and try again."
          : "We couldn't send the email. Please try again.",
    };
  }
  return { step: "code", email: email.data };
}

async function verifyCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (prev.step !== "code") return prev;

  const knownEmail = prev.email;
  const email = knownEmail ?? emailSchema.safeParse(String(formData.get("email") ?? "").trim()).data;
  if (!email) {
    return { ...prev, error: "Enter the email address the code was sent to." };
  }
  const code = codeSchema.safeParse(String(formData.get("code") ?? "").replace(/\s/g, ""));
  if (!code.success) {
    return { ...prev, error: "Enter the code from the email, numbers only." };
  }

  const supabase = await createClient();
  // Works for both first-time ("Confirm signup") and returning ("Magic Link") emails.
  const { error } = await supabase.auth.verifyOtp({ email, token: code.data, type: "email" });
  if (error) {
    return { ...prev, error: "That code didn't work. It may have expired. Try again or request a new email." };
  }

  redirect(await postLoginPath(String(formData.get("next") ?? "/")));
}

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  switch (formData.get("intent")) {
    case "code":
      return verifyCode(prev, formData);
    case "restart":
      return { step: "email" };
    default:
      return sendLink(prev, formData);
  }
}
