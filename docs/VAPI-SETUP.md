# Twilio + Vapi setup

- **Twilio** gives you the phone number(s).
- **Vapi** runs the conversation: speech-to-text, the AI model, the voice, and browser calls. Vapi uses
  Daily for the audio internally, so you do not need a Daily account.
- **This app** is the CRM and the assistant's tools. Vapi sends every call event to
  `https://YOUR-APP/api/vapi/webhook`.

Before you start: the app is deployed (docs/DEPLOY.md), so Vapi can reach it over https.

## 1. Accounts and keys

| Where | What to copy | Put in `.env` **and** Vercel |
|---|---|---|
| dashboard.vapi.ai → API Keys | **Private** key | `VAPI_API_KEY` |
| dashboard.vapi.ai → API Keys | **Public** key | `NEXT_PUBLIC_VAPI_PUBLIC_KEY` |
| console.twilio.com → Account info | Account SID, Auth Token | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (only `.env` is needed) |
| console.twilio.com → Phone Numbers → Buy a number (Voice) | the number, e.g. `+14155550123` | `TWILIO_PHONE_NUMBERS` (several = comma separated) |
| already in `.env` from `npm run setup` | | `VAPI_WEBHOOK_SECRET`, `APP_URL` = your https address |

Add credit to both Vapi (calls) and Twilio (number rent and call minutes). A **Twilio trial** account
can only call numbers you have verified in Twilio, and plays a trial message first.

Redeploy Vercel after adding the variables.

## 2. One command

On your computer, in the project folder:

```bash
npm run vapi:setup
```

It does, in order (safe to run again; it updates instead of duplicating):

1. checks the Twilio account and that each number exists on it with voice
2. creates the 7 tools from [`vapi/tools.json`](../vapi/tools.json) in Vapi, pointing at your webhook
   with `Authorization: Bearer VAPI_WEBHOOK_SECRET`
3. creates the assistant "MultiVoice Agent" with [`vapi/assistant-prompt.md`](../vapi/assistant-prompt.md)
   (time zone from Settings), the tools, the webhook, recording on
4. imports each Twilio number into Vapi and attaches the assistant for inbound calls
5. writes the assistant id and phone number ids into the portal **Settings**

Then in Vapi → Assistants → MultiVoice Agent, choose a **voice** and **transcriber language** that suit
your callers (re-running the command keeps them). Optional: add the built-in **Transfer Call** tool
with your sales number.

## 3. Test

1. Portal → **Test call** → *Start talking* (browser). The call appears under **Calls → Browser tests**.
2. Call your Twilio number from a phone. It appears under **Calls → Inbound** with transcript and summary.
3. Add yourself as a contact with consent → **Call now**. Your phone rings.
4. Switch on automatic calling in **Campaigns** when everything works.

Outbound to other countries: Twilio → Voice → Settings → **Geo permissions** must allow that country.

## Manual setup (instead of step 2)

1. Vapi → Tools → *Create Tool* → Function, for each tool in `vapi/tools.json`. Server URL = webhook,
   add header `Authorization: Bearer <VAPI_WEBHOOK_SECRET>` (or a Bearer Token credential with that value).
2. Vapi → Assistants → Create: paste the prompt, add the tools, Server URL = webhook with the same header,
   server messages `status-update`, `end-of-call-report`, `tool-calls`.
3. Vapi → Phone Numbers → Import → Twilio (number, Account SID, Auth Token) → inbound assistant = yours,
   Server URL = webhook.
4. Copy the assistant id and phone number id(s) into portal **Settings**.

The app sends these variables on outbound calls: `customerName`, `businessName`, `agentName`, `company`,
`city`, `notes`. Browser test calls send the same names.

Vapi also offers a free Vapi number (US only, **inbound only**: Vapi does not allow outbound calls or
campaigns on it). It works for an inbound test, but use Twilio for outbound.

## Troubleshooting

| Symptom | Check |
|---|---|
| `vapi:setup`: "APP_URL must be your public https address" | Deploy first; Vapi cannot reach localhost |
| `vapi:setup`: "Twilio refused…" | Account SID / Auth Token copied from the right Twilio account |
| Calls never appear in the portal | Vercel env has the same `VAPI_WEBHOOK_SECRET` as `.env`; Vercel logs show `401`? |
| Agent says "the system could not do that" | Vercel logs `[vapi tool]` lines |
| "Vapi 401" on Call now | `VAPI_API_KEY` in Vercel is the **private** key |
| Call now: "Vapi 400 …" | Number not imported (run `vapi:setup`), or the destination country is blocked in Twilio geo permissions |
| Twilio trial: call fails or plays a message | Verify the destination number in Twilio, or upgrade the account |
| Test call: microphone error | Allow the microphone; use https (Vercel) or localhost |
