"use server";

import { redirect } from "next/navigation";
import { postLoginPath } from "@/lib/auth";
import { emailSchema, sendSignInEmail, verifySignInCode } from "@/lib/otp";

// In the "code" step, email is null when we don't know it yet (e.g. arriving
// from a sign-in link that didn't work); the form then asks for it.
export type LoginState =
  | { step: "email"; error?: string }
  | { step: "code"; email: string | null; error?: string; enteredEmail?: string };

async function sendLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!email.success) {
    return { step: "email", error: "Please enter a valid email address." };
  }
  const error = await sendSignInEmail(email.data);
  return error ? { step: "email", error } : { step: "code", email: email.data };
}

async function verifyCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  if (prev.step !== "code") return prev;

  const email = prev.email ?? emailSchema.safeParse(String(formData.get("email") ?? "").trim()).data;
  if (!email) {
    return { ...prev, error: "Enter the email address the code was sent to." };
  }
  const error = await verifySignInCode(email, String(formData.get("code") ?? ""));
  // Keep a typed email so the field refills after React resets the form.
  if (error) return { ...prev, error, enteredEmail: prev.email ? undefined : email };

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
