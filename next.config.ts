import type { NextConfig } from "next";

// Report-only for now: violations are logged by /api/csp-report, nothing is
// blocked. No nonces, because they would force every page to render
// dynamically; inline scripts are Next's own bootstrap.
// Previews load Vercel's feedback toolbar from vercel.live.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${vercelLive}`,
  `style-src 'self' 'unsafe-inline'${vercelLive}`,
  `img-src 'self' data: blob:${vercelLive}`,
  `font-src 'self'${vercelLive}`,
  `connect-src 'self'${vercelLive}`,
  `frame-src 'self'${vercelLive}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "worker-src 'self'",
  "manifest-src 'self'",
  // Not report-to: Chrome didn't deliver to a relative Reporting-Endpoints URL in testing.
  "report-uri /api/csp-report",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Content-Security-Policy-Report-Only", value: CSP }]
            : []),
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
