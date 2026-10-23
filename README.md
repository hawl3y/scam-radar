# Scam Radar

A mobile-friendly web app (PWA) where neighbors report and confirm local scams. See `PROJECT_BRIEF.md` for scope.

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS, Supabase (Postgres + PostGIS + pgvector, Auth), Vercel.

## Local setup (macOS)

1. **Node:** install [nvm](https://github.com/nvm-sh/nvm), then from the repo root:
   ```sh
   nvm install   # reads .nvmrc (Node 24)
   nvm use
   ```
2. **Supabase CLI:**
   ```sh
   brew install supabase/tap/supabase
   supabase login
   ```
3. **Dependencies:**
   ```sh
   npm install
   ```
4. **Environment:**
   ```sh
   cp .env.example .env.local
   ```
   Fill in the **dev** project's URL and publishable key (Supabase Dashboard → Project Settings → API Keys).
5. **Database:** link the dev project and apply migrations:
   ```sh
   supabase link --project-ref <dev-project-ref>
   supabase db push
   ```
6. **Run:**
   ```sh
   npm run dev
   ```
   Open http://localhost:3000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Unit tests (Vitest) |

## Supabase projects

Two hosted projects: `scam-radar-dev` and `scam-radar-prod`. No local Docker database.

### Database changes
Only through migrations:
```sh
supabase migration new <name>      # creates supabase/migrations/<timestamp>_<name>.sql
supabase db push                   # applies to the currently linked project
```
To apply to prod, link prod, push, then link dev again:
```sh
supabase link --project-ref <prod-project-ref> && supabase db push
supabase link --project-ref <dev-project-ref>
```

### Auth settings (do this in each project's dashboard)
- **Authentication → Sign In / Providers → Email:** enabled. Leave "Confirm email" on.
- **Authentication → URL Configuration:**
  - Site URL: `http://localhost:3000` (dev) or the production URL (prod).
  - Redirect URLs:
    - dev: `http://localhost:3000/**` and `https://*-<vercel-team-slug>.vercel.app/**` (preview deploys)
    - prod: `https://<production-domain>/**`
- **Authentication → Emails:** paste `supabase/templates/sign-in.html` into both **Magic Link** and **Confirm signup**. The link goes to `/auth/confirm` and the email includes a code. People who added the app to their iPhone home screen need the code, because the home-screen app doesn't share sign-ins with Safari.

Supabase's built-in email sender is limited to a few emails per hour. That's fine for testing. A real email provider is set up in Phase 3.

## Deploys (Vercel)

- Import the GitHub repo in Vercel (framework: Next.js; defaults are fine).
- Environment variables (Project Settings → Environment Variables):
  - **Production:** prod project's `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - **Preview** and **Development:** the dev project's values
- Every branch push gets a preview deploy; `main` deploys to production.
