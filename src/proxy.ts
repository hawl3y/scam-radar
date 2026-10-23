import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static files, images, icons, the manifest, and the service worker.
    "/((?!_next/static|_next/image|sw\\.js|manifest\\.webmanifest|icon|apple-icon|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
