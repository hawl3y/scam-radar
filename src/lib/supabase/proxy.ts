import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

const PROTECTED_PATHS = ["/settings", "/report", "/admin"];
const ACTIVITY_COOKIE = "sr_active_day";

const isProtected = (pathname: string) =>
  PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

// Refreshes the auth session cookie on every request and redirects
// signed-out visitors away from pages that need an account.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Don't run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  // Pilot metrics: one activity row per signed-in user per day.
  if (signedIn) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
    if (request.cookies.get(ACTIVITY_COOKIE)?.value !== today) {
      const { error } = await supabase.rpc("touch_activity");
      if (!error) {
        response.cookies.set(ACTIVITY_COOKIE, today, {
          httpOnly: true,
          sameSite: "lax",
          secure: true,
          path: "/",
          maxAge: 60 * 60 * 36,
        });
      }
    }
  }

  const { pathname, search } = request.nextUrl;
  if (!signedIn && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
