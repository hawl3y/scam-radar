## What changed


## Checklist

- [ ] Security reviewed (see CLAUDE.md → Security checklist); results:
  - Input validation and redaction:
  - Injection (SQL, XSS, email):
  - Auth and RLS on new tables or functions:
  - CSRF on new actions or routes:
  - Open redirects:
  - Rate limits on new public endpoints:
  - No secrets in client code:
  - New dependencies:
- [ ] Comments explain non-obvious why only
- [ ] Lint, typecheck, and tests pass
- [ ] Tested on the Vercel preview
