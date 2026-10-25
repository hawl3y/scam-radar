"use server";

import { cookies } from "next/headers";
import { emailSchema, sendSignInEmail, verifySignInCode } from "@/lib/otp";

// Sign-in inside the report flow, so the draft stays on the page.

export type ReportSignInState = { step: "email" | "code"; email?: string; error?: string; signedIn?: boolean };

/** If they tap the emailed link instead of entering the code, come back to the report. */
const RETURN_TO_COOKIE = "byebell_return_to"; // read by /auth/confirm

export async function reportSignIn(prev: ReportSignInState, formData: FormData): Promise<ReportSignInState> {
  switch (formData.get("intent")) {
    case "verify": {
      if (!prev.email) return { step: "email" };
      const error = await verifySignInCode(prev.email, String(formData.get("code") ?? ""));
      return error ? { ...prev, error } : { step: "code", email: prev.email, signedIn: true };
    }
    case "restart":
      return { step: "email" };
    default: {
      const email = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
      if (!email.success) return { step: "email", error: "Please enter a valid email address." };
      const error = await sendSignInEmail(email.data);
      if (error) return { step: "email", error };
      (await cookies()).set(RETURN_TO_COOKIE, "/report", {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 60 * 60,
      });
      return { step: "code", email: email.data };
    }
  }
}
