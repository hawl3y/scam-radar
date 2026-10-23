import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { postLoginPath } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Sign-in link landing. Two shapes are supported:
// - ?token_hash=…&type=… : our custom template (supabase/templates/sign-in.html).
//   Works in any browser.
// - ?code=… : Supabase's default email ({{ .ConfirmationURL }}), used if the
//   custom template isn't installed. Needs the PKCE code verifier cookie, so
//   the link must open in the browser that requested it.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let error: { message: string } | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    error = { message: searchParams.get("error_description") ?? "missing code or token_hash" };
  }

  if (error) {
    console.error("sign-in link failed", error.message);
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }

  const path = await postLoginPath("/");
  return NextResponse.redirect(new URL(path, request.url));
}
