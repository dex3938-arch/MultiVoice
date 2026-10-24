# MultiVoice Calling Agent

AI voice agent for **inbound and outbound phone calls** with a built-in **CRM portal**.

- **Vapi**: voice conversation (speech-to-text, AI model, voice) and browser calls (Vapi uses Daily for audio internally, no separate Daily account needed)
- **Twilio**: phone numbers, imported into Vapi automatically by `npm run vapi:setup`
- **Supabase**: Postgres database
- **Vercel**: hosting (Next.js 15, React 19, Tailwind 4)

## Voice providers and failover
Calls go to **Vapi** first and to **Dograh** (open-source, hosted or self-hosted) as the backup. If Vapi runs out of
credits, rejects the key, rate-limits or is down, the same call is placed through Dograh immediately and Vapi rests
(credits 6 h, key 30 min, outage 5 min). Inbound calls go Twilio → `/api/twilio/voice` (signed) → first healthy provider.
Settings → Voice providers shows each provider's health and a "Use again now" button. Setup: docs/DOGRAH-SETUP.md.

## What it does
- Answers inbound calls 24/7; runs outbound campaigns (consent, calling hours, retries, Do-Not-Call, concurrency, monthly budget, round-robin across numbers)
- During calls the assistant uses 7 tools on this app: knowledge search, save contact details, book appointment, schedule callback, create follow-up, Do-Not-Call, record outcome
- Saves every call: transcript, recording, summary, outcome, cost, duration
- Knowledge base that reads long PDFs (100+ pages: headers/footers and page numbers removed, wrapped lines re-joined, questions detected) and answers in milliseconds; "Ask the knowledge base" tester in the portal
- CRM portal: dashboard, contacts (CSV import, tags, status, consent), calls, follow-ups (with "teach the agent"), appointments, campaigns, knowledge base (PDF/Word/TXT/MD/CSV/JSON), browser test call, settings, users, my account
- Blue & white glass design, responsive for phones (bottom bar + drawer), fast (static landing, server components, instant loading states)
- SEO website: 7 pages (home, features, AI receptionist, outbound campaigns, integrations, security, FAQ) with unique titles, descriptions, keywords and content, JSON-LD, Open Graph image, sitemap and robots; the portal is noindex
- Security: mandatory TOTP MFA, roles, audit log, rate limits, CSP/HSTS, signed webhooks, RLS (see docs/SECURITY.md)

## Quick start
```bash
npm install
npm run setup      # asks for Supabase URLs, writes .env, creates tables + admin
npm run dev        # http://localhost:3000
```
Then: docs/DEPLOY.md (Vercel) → docs/VAPI-SETUP.md (Twilio + Vapi, one command: `npm run vapi:setup`).

## Scripts
| Command | |
|---|---|
| `npm run dev` | local development |
| `npm run build` / `npm start` | production build / server |
| `npm test` | unit tests (call logic, dialer rules, phone numbers, knowledge search, TOTP, webhook auth) |
| `npm run typecheck` / `npm run lint` | checks |
| `npm run db:deploy` / `npm run db:rls` / `npm run db:seed` | migrations / RLS lock / starting data |
| `npm run vapi:setup` | connect Twilio + Vapi: tools, assistant, number import, Settings |
| `npm run mfa:reset -- email` | emergency two-factor reset |

## Project layout
```
src/app/(site)/…              public website (7 SEO pages)
src/app/login, setup-mfa      sign-in + two-factor
src/app/app/…                 CRM portal (dashboard, contacts, calls, …)
src/app/api/vapi/webhook      Vapi events + tools
src/app/api/dialer/tick       outbound dialer heartbeat (cron)
src/app/api/dograh/…          Dograh webhook + tools
src/app/api/twilio/voice      signed inbound router (Vapi → Dograh failover)
src/lib/providers/            failover rules, provider health, Dograh client
src/lib/calls.ts              what each Vapi event does
src/lib/call-logic.ts         outcomes, report parsing, time zones, tool input rules (tested)
src/lib/dialer.ts             automatic outbound calling
src/lib/knowledge/            document parsing + search
vapi/, dograh/                assistant prompts, tool definitions, webhook template
prisma/                       schema, migrations, RLS, seed
```
