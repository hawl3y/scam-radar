# Security review (Nov 2026)

Scope: the whole app at `main` after PR #24, including the database (checked against the live dev catalog, not only the migrations), server actions, route handlers, emails, headers, and CI. No high-severity issues were found. Five medium issues are fixed on the `security-review` branch. Low issues are listed for the owner to decide.

## Fixed (medium)

| # | Finding | Location | Fix |
|---|---|---|---|
| M1 | **Open redirect after sign-in.** `safeNext` blocked `//` and `/\`, but browsers drop tabs and newlines in URLs, so `/login?next=/%09/evil.test` sent someone to `evil.test` right after a real sign-in. | `src/lib/safe-next.ts` (used by `/login`, `/auth/confirm`) | `safeNext` now parses the value the way browsers do and only keeps it if it stays on our origin. Tests cover tab, newline, CRLF, and backslash variants. |
| M2 | **No app-level limits on sign-in emails or code checks.** Supabase's auth limits are per IP, and every request reaches Supabase from our servers, so they can't tell one visitor from another. That allowed email bombing of any address (also draining Resend's 100/day, which alerts share) and unthrottled code guessing. | `src/lib/otp.ts` | Per-visitor (IP) and per-address limits on sending (10/hr per IP, 5/hr per address) and on code checks (30/hr per IP, 10/hr per address). Addresses and IPs are hashed with `RATE_LIMIT_SALT`, like the other limits. |
| M3 | **Public functions skipped moderation.** `get_report`, `nearby_reports`, and `report_cluster` filtered on `status = 'active'` only, so anyone with the publishable key could read reports from limited accounts that the app hides. | Database functions (`20261023230300_create_reports.sql`, `20261024140100_create_clusters.sql`) | Migration `20261102140000_security_hardening.sql`: revokes `get_report` and `nearby_reports` (unused by the app) from anon and signed-in users; `report_cluster` now uses `visible_reports()` (plus the viewer's own reports). Applied to dev. |
| M4 | **Prod database secret exposed to a third-party action.** `SUPABASE_PROD_DB_URL` was set at the job level, so `supabase/setup-cli` (pinned only to a movable tag) could read it. | `.github/workflows/migrate-prod.yml` | The secret is now passed only to the `supabase db push` step, and the action is pinned to a commit SHA. |
| M5 | **Actions not pinned; token permissions not limited.** All actions used movable major tags, and no workflow set `permissions`, so the `GITHUB_TOKEN` had the repo default. | `.github/workflows/*.yml` | Every action is pinned to a full commit SHA (version in a comment). `permissions: contents: read` on CI and migrate, `permissions: {}` on ingest. Checkout uses `persist-credentials: false`. |

## Low (for review, not changed)

| # | Finding | Location | Suggested fix |
|---|---|---|---|
| L1 | No Content-Security-Policy. Framing is already blocked by `X-Frame-Options: DENY`, and no XSS was found, so this is defense in depth. | `next.config.ts` | Add a CSP without nonces (nonces would force every page to render dynamically): `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`. Allow `https://vercel.live` on previews only. Test every page on a preview first. |
| L2 | Supabase auth cookies aren't `HttpOnly` or `Secure` (the `@supabase/ssr` defaults). Nothing in the browser reads them; the app only uses Supabase on the server. | `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts` | Pass `cookieOptions: { httpOnly: true, secure: true, sameSite: "lax" }` to both `createServerClient` calls. Check sign-in, sign-out, and session refresh on a preview. |
| L3 | HSTS (sent by Vercel) has no `includeSubDomains` or `preload`. | Vercel / `next.config.ts` | Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` once every subdomain is HTTPS-only. |
| L4 | No `Permissions-Policy` header. | `next.config.ts` | `camera=(), microphone=(), geolocation=(), interest-cohort=()`. |
| L5 | Email preference tokens never expire and can't be revoked. They can only change that person's alert setting. | `src/lib/alerts/tokens.ts` | Accept as is, or add a version number that's bumped to invalidate old links. Rotating `EMAIL_TOKEN_SECRET` invalidates all links at once. |
| L6 | App-level limits on "got this too", rating, and flagging can be skipped by calling the RPCs directly with the publishable key and your own session. Database constraints still allow only one of each per account and report or alert. | `corroborate`, `rate_report`, `flag_report` | If abuse shows up, call `hit_rate_limit` inside those functions. |
| L7 | The rate limiter fails open if the database call errors (deliberate, so an outage doesn't block reporting). | `src/lib/rate-limit.ts` | Accept, or fail closed for sign-in limits only. |
| L8 | Anonymous usage counts (`recordClientUsage`) have no rate limit, so metrics can be inflated. | `src/app/usage-actions.ts` | Add a per-IP limit (e.g. 120/hour). |
| L9 | `my_example_state` returns the IDs (not the text) of limited accounts' reports to signed-in viewers. | Database function | Filter with `visible_reports()` plus the viewer's own reports. |
| L10 | Login CSRF: someone could send a victim their own sign-in link, signing the victim into the sender's account. Low impact here. | `src/app/auth/confirm/route.ts` | Accept (common to all emailed sign-in links). |
| L11 | `emailRedirectTo` is built from the request's `Origin` header. Next rejects cross-site server action calls, and Supabase only accepts allow-listed redirect URLs. | `src/lib/otp.ts` | Build it from `NEXT_PUBLIC_SITE_URL` instead. |
| L12 | `cron-auth.ts` and `tokens.ts` read secrets without `import "server-only"`. Next doesn't put non-`NEXT_PUBLIC_` values in the browser bundle (confirmed by scanning the build), so this is a guard against future mistakes. | `src/lib/cron-auth.ts`, `src/lib/alerts/tokens.ts` | Add `import "server-only"`. |
| L13 | Sign-in emails sent from many IPs to many addresses can still use up the shared Resend quota. | Sign-in | Check Supabase → Auth → Rate Limits (emails per hour) in prod. Add a CAPTCHA (e.g. Turnstile) only if abuse appears. |
| L14 | New accounts can post 5 reports an hour (20 a day). Limited-account handling, flags, and auto-hide at 3 flags cover the rest. | Report flow | Accept for the pilot. |
| L15 | No automated dependency updates, so the SHA-pinned actions and npm packages won't get update PRs. | `.github/` | Add `.github/dependabot.yml` for `github-actions` and `npm` (weekly). |
| L16 | Error logs can include provider error messages (e.g. Resend), which may include a recipient address. | `src/lib/alerts/instant.ts`, `digest.ts` | Log `e.message` without the address, or accept (Vercel logs are private). |

## Checked and OK

- **SQL injection:** every query goes through supabase-js with parameters. No database function builds SQL dynamically (no `EXECUTE`). No raw PostgREST filter strings.
- **XSS:** React escapes report text. Links in reports are shown defanged and never as links. The only raw HTML is the flyer's QR code, built from a fixed URL. IC3 headline links must start with `https://`. Email HTML escapes every value (`escapeHtml`), and flag notes are redacted before saving.
- **Email header injection:** Resend's API takes JSON fields. Subjects are built from fixed labels, never from user text.
- **CSRF:**
  - Next checks the Origin header on server actions.
  - Unsubscribe `POST` requires the signed token, and `GET` never changes anything.
  - Preferences require the signed token.
  - Sign-out is `POST`. With `SameSite=Lax`, the cookie isn't sent on cross-site posts.
  - Cron routes require the bearer secret.
- **RLS:** enabled on all 19 tables. Anon can read only `zip_centroids`. Signed-in users can read their own profile, corroborations, ratings, and flags, and can update only `home_zip`, `radius_miles`, `alert_mode`, and `last_feed_visit_at` on their own profile (not `reputation`). Reports are inserted with the service key after redaction.
- **SECURITY DEFINER functions:** all 51 set `search_path = ''`. Anon can execute only the public read functions. Write and admin functions check `auth.uid()` or `is_admin()` in the database. Internal functions aren't callable by clients.
- **IDOR:** corroborate, rate, flag, settings, and delete-account all act on `auth.uid()` or the signed-in user, never an ID sent by the client. Admin pages call `is_admin()`, and admin RPCs re-check it.
- **Service key:** used only in `server-only` modules. A build scan found no secret values in `.next/static`, and the publishable key isn't there either (the browser never talks to Supabase).
- **Secrets compare:** the cron bearer and email tokens use `timingSafeEqual`.
- **Account enumeration:** sign-in responses are identical for new and existing addresses.
- **Headers in production:** HSTS (Vercel), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. The app's own cookies are `HttpOnly; Secure; SameSite=Lax`.
- **Supply chain:** `npm audit` found 0 vulnerabilities (with and without dev dependencies). CI runs on `pull_request`, not `pull_request_target`, so forks get no secrets.

## Not checked from here

Supabase dashboard settings in prod:
- OTP expiry and length.
- Auth rate limits.
- The redirect URL allow list.
- Whether "Confirm email" is on.

Also the Vercel and Resend account settings: 2FA, team access, and API key scopes.
