# Dograh setup (backup voice provider)

Dograh is an open-source voice agent platform (hosted at **app.dograh.com**, or self-hosted with Docker).
It does both **inbound and outbound** calls on your Twilio number. In MultiVoice it is the second
provider: when Vapi runs out of credits, has a bad key or is down, new calls go to Dograh automatically,
and back to Vapi once it is healthy again (Settings → Voice providers → Provider health).

## How the failover works

| Situation | What happens |
|---|---|
| Outbound call, Vapi refuses (no credits / 402, bad key, outage, rate limit) | The same call is placed through Dograh within the same second. Vapi rests: credits 6 h, key 30 min, outage 5 min, rate limit 2 min |
| Outbound call, the customer's number is invalid | Not retried on Dograh (it would fail there too); counts as an attempt |
| Both providers fail on our side | The call is marked FAILED, the contact keeps its attempt, the dialer stops the round |
| Inbound call (router on) | Twilio → `/api/twilio/voice` → the first healthy provider (Vapi, else Dograh) |
| A Vapi call ends because of billing | Vapi rests, so the next inbound and outbound calls go to Dograh |
| You added credits | Settings → Provider health → **Use again now** |

## 1. Dograh account and key

1. Sign up at app.dograh.com (or self-host: docs.dograh.com → Deployment).
2. Dograh → **Settings → API Keys** → create a key (shown once) → `DOGRAH_API_KEY` in `.env` and Vercel.
3. `DOGRAH_WEBHOOK_SECRET`: 24+ random characters (`npm run setup` creates it) → `.env` and Vercel.
4. Self-hosted: put your backend address in portal Settings → **Dograh base URL** and **Dograh inbound URL**.

## 2. Telephony (Twilio) in Dograh

Dograh → **Telephony configurations** → add **Twilio** with your Account SID and Auth Token and add your
Twilio number (E.164, e.g. +14155550123). Outbound needs nothing else.

Do **not** leave Dograh in charge of the Twilio Voice URL if you want inbound failover: after you save an
inbound workflow in Dograh, run `npm run vapi:setup` again so the number points at the MultiVoice router.

## 3. Agent

1. Create an agent. Prompt: [`dograh/agent-prompt.md`](../dograh/agent-prompt.md) (same rules as the Vapi assistant; outbound calls receive
   `customerName`, `businessName`, `agentName`, `company`, `city`, `notes`, `phone_number`, `direction` in `initial_context`).
2. Tools: create the 7 HTTP API tools from [`dograh/tools.md`](../dograh/tools.md) and attach them to the conversation node.
3. Add a **Webhook** node at the end of the call:
   - URL `https://YOUR-APP/api/dograh/webhook`, method POST
   - Credential **BEARER_TOKEN** = `DOGRAH_WEBHOOK_SECRET`
   - Payload: [`dograh/webhook-template.json`](../dograh/webhook-template.json)
4. Assign the agent as the **inbound workflow** of your number (for inbound calls through Dograh).
5. Copy the **Agent UUID** → portal Settings → Voice providers → **Dograh agent UUID**. Optional: the
   telephony configuration id and from-number id if you have several.

## 4. Inbound router

Portal Settings → tick **Route inbound calls through this app**, add `TWILIO_AUTH_TOKEN` to Vercel, then run:

```bash
npm run vapi:setup
```

It imports the number into Vapi, saves Vapi's inbound URL, and sets the Twilio Voice URL to
`https://YOUR-APP/api/twilio/voice`. The router only answers requests signed by Twilio.

## 5. Test the failover

1. Settings → Provider order **Dograh only** → Contacts → **Call now** → the call shows "Via Dograh".
2. Back to **Vapi → Dograh**. To simulate "Vapi out of credits", temporarily put a wrong `VAPI_API_KEY`
   in Vercel and redeploy → Call now → "Vapi failed, the backup took over" → Provider health shows Vapi resting.
3. Restore the key → **Use again now**.

Free tiers: Vapi gives new accounts a one-time trial credit; its free phone numbers are US-only and inbound-only,
so use your Twilio number. Dograh self-hosted has no platform fee (you pay Twilio and the AI model providers).
Check both providers' pricing pages for the current offer.
