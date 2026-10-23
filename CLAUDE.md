# CLAUDE.md — scam-radar

## Start here
1. Read `PROJECT_BRIEF.md` fully before planning or writing code. It is the source of truth.
2. Work **one phase at a time** (see brief §8). Don't start a phase until the previous phase's "Done when" criteria pass.
3. Before writing code for a phase, propose a short plan and wait for approval.

## Rules
- Stay within the MVP scope. Anything in the brief's Non-goals (§5) is out unless the owner says otherwise.
- TypeScript only. Don't add Python or other languages without asking.
- Privacy rules in the brief (§7) are non-negotiable: redact before saving, approximate locations only, row-level security on every table.
- Never commit secrets. Use `.env.local` locally and Vercel environment variables for deploys.
- Database changes only through Supabase migrations. Apply them to dev (`supabase db push`, linked to dev) before testing a preview; never push to prod by hand. CI applies them to prod on merge.
- Migrations must be backward compatible with the code already in production (add, don't rename or drop in the same change), because the prod migration and the Vercel deploy run at the same time.
- Small, focused commits on a feature branch, opened as a PR. CI (lint, typecheck, test) must pass; the owner merges to `main` after checking the Vercel preview.
- Keep `README.md` setup steps current whenever setup changes.
- When something in the brief is unclear or conflicts with best practice, ask instead of guessing.
- Keep responses brief: only what's needed.

## Environment
- Owner develops on macOS (VS Code + Claude Code). Keep setup reproducible and documented in `README.md`.
- GitHub: https://github.com/hawl3y/scam-radar
- Hosting: Vercel. Previews (dev database) per branch; production (prod database) from `main` at https://scam-radar.joechawley.com.
