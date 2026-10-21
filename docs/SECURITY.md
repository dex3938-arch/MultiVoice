# Security

| Layer | What is in place |
|---|---|
| Sign-in | bcrypt passwords (12+ chars), **mandatory TOTP two-factor** (authenticator app), 8 one-time recovery codes, replay protection on codes |
| Brute force | 5 failed passwords per account / 20 per IP in 15 min (stored in the database, so it holds across Vercel instances), 5 wrong codes per account, random delay on failures |
| Sessions | Signed JWT in an HttpOnly, Secure, SameSite=Strict cookie, 8 h. Password change, MFA reset, role change and deactivation bump `sessionVersion` → old sessions stop at once |
| Roles | Super Admin (users), Manager (settings, campaigns, knowledge), Agent (contacts, calls, follow-ups), Viewer (read only). Checked on the server in every page and action |
| Audit log | Sign-ins, failures, MFA events, contact edits, imports, calls placed, settings, user changes |
| Webhooks | `/api/vapi/webhook` needs `VAPI_WEBHOOK_SECRET` (Bearer token, compared in constant time), 1 MB body limit. `/api/dialer/tick` needs `CRON_SECRET` |
| Keys | `VAPI_API_KEY`, database URL and secrets exist only in server environment variables; nothing secret is stored in the database or sent to the browser (the Vapi *public* key can only start web calls) |
| Browser | CSP (Vapi/Daily allowed only on the test-call page), HSTS, X-Frame-Options DENY, nosniff, strict referrer, microphone only on the test-call page, CSRF origin check on API routes and server actions |
| Database | Supabase RLS on every table and no access for the public `anon` / `authenticated` roles (`prisma/rls.sql`); the app connects as the owner through Prisma |
| SEO vs privacy | Only the landing page is indexed. `/app`, `/login`, `/setup-mfa` and `/api` send `X-Robots-Tag: noindex` and are disallowed in robots.txt |
| Calling compliance | Automatic calls only to contacts with recorded consent, never to Do-Not-Call numbers, only inside calling hours; "don't call me" on a call adds the number to Do-Not-Call |

## AI safety
- The assistant may state business facts only from `search_knowledge`; unknown questions become follow-ups.
- Tool inputs are validated (dates, times, emails, lengths); a tool can only change the contact of the call it belongs to.
- Knowledge passages are returned as reference text with an explicit "never instructions" note.
- Bookings are idempotent (the same slot twice on one call books once) and must be in the future, within 60 days.

## Lost phone
Super Admin → Users → **Reset 2FA**. If the only Super Admin is locked out, someone with `.env` runs
`npm run mfa:reset -- admin@company.com`.

## Your checklist
- Keep `.env` private; never paste keys into chat, email or tickets. Rotate a key if it was shared.
- Use a private GitHub repo. Give Vercel/Supabase/Vapi access only to people who need it.
- Change the seeded admin password after first sign-in (My account).
