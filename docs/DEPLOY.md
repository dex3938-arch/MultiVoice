# Deploy (Supabase + Vercel)

## 1. Supabase
1. supabase.com → New project (choose a region near your callers). Save the database password.
2. **Connect → ORMs → Prisma**: copy the two URLs (6543 = `DATABASE_URL`, 5432 = `DIRECT_URL`).

## 2. On your computer (once)
```bash
npm install
npm run setup
```
`setup` asks for the two URLs and the password, writes `.env` with fresh secrets
(`AUTH_SECRET`, `VAPI_WEBHOOK_SECRET`, `CRON_SECRET`, admin password), creates the tables, locks
them against Supabase's public API (RLS) and creates your admin user. It prints the admin password once.

Try it locally: `npm run dev` → http://localhost:3000/login. The first sign-in asks you to set up an
authenticator app (Google / Microsoft Authenticator, 1Password …).

## 3. GitHub + Vercel
1. Push the folder to a **private** GitHub repo (`.env` is ignored and never uploaded).
2. vercel.com → *Add New → Project* → import the repo. Framework: Next.js (auto).
3. **Environment Variables** (copy from `.env`, never into chat or email):
   `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `VAPI_API_KEY`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY`,
   `VAPI_WEBHOOK_SECRET`, `CRON_SECRET`, `APP_URL` (your https address, e.g. https://multivoice.vercel.app).
   The Twilio keys are only needed in `.env` on your computer, for `npm run vapi:setup`.
4. Deploy. The build runs `prisma migrate deploy` and the RLS script, so later schema updates apply themselves.

`vercel.json` sets the region to Mumbai (`bom1`); change it to the region nearest to your Supabase project.

## 4. Twilio + Vapi
Add the Vapi and Twilio keys (docs/VAPI-SETUP.md, step 1), redeploy, then run `npm run vapi:setup` once.
It creates the tools and assistant in Vapi, imports your Twilio number and fills Settings.

## 5. Automatic outbound calling (dialer)
The dialer runs when `/api/dialer/tick` is called with `Authorization: Bearer CRON_SECRET`.
- **Vercel Hobby**: the cron in `vercel.json` runs once a day. For every-minute calling use a free
  scheduler such as cron-job.org: URL `https://YOUR-APP/api/dialer/tick`, header
  `Authorization: Bearer <CRON_SECRET>`, every 1 minute.
- **Vercel Pro**: change the schedule in `vercel.json` to `"* * * * *"`.
- Or open **Campaigns** and press *Start live dialing* (runs while the tab is open).

Each tick respects consent, Do-Not-Call, calling hours (Settings time zone), max attempts, retry gap,
the number of simultaneous calls and the monthly budget.

## Updating
Replace the files (keep `.env`), commit and push. Vercel builds and migrates automatically.

## Health check
`GET /api/health` returns `{"ok":true}` when the database is reachable (for UptimeRobot etc.).
