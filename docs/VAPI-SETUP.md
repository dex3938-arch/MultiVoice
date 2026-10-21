# Vapi + Twilio setup

MultiVoice uses **Vapi** for the voice conversation (speech-to-text, the AI model, the voice) and the
phone line, and a **Twilio** number imported into Vapi. This app is the CRM and the "brain's tools":
Vapi sends every call event to `https://YOUR-APP/api/vapi/webhook`.

You need: a Vapi account (dashboard.vapi.ai), a Twilio account with a voice-capable number, and the
app deployed (docs/DEPLOY.md) so Vapi can reach it.

## 1. Keys → Vercel environment variables

| Where in Vapi | Variable | Notes |
|---|---|---|
| API Keys → **Private** key | `VAPI_API_KEY` | Server only. Places outbound calls. |
| API Keys → **Public** key | `NEXT_PUBLIC_VAPI_PUBLIC_KEY` | Browser test call only. |
| (you create it) | `VAPI_WEBHOOK_SECRET` | 24+ random characters. `npm run setup` generates one in `.env`. |

Redeploy after adding them. **Settings → Server keys** in the portal shows which are set.

## 2. Webhook credential

Vapi → **Integrations → Custom Credential** (or *Server Configuration*) → **Bearer Token**:
- Token: the same value as `VAPI_WEBHOOK_SECRET`
- Header: `Authorization` (default)

Note the credential id. Every request without this token gets `401`.

## 3. Tools

Vapi → **Tools** → *Create Tool* → **Function**, once for each tool in [`vapi/tools.json`](../vapi/tools.json)
(name, description and parameters exactly as in the file). For every tool:
- **Server URL**: `https://YOUR-APP/api/vapi/webhook`
- **Credential**: the Bearer Token credential from step 2
- Leave *Async* off (the assistant waits for the answer).

Optional built-in tools: **Transfer Call** (to a sales number, for "talk to a person") and **End Call**.

## 4. Assistant

Vapi → **Assistants** → *Create* (Blank):
- **System prompt**: paste [`vapi/assistant-prompt.md`](../vapi/assistant-prompt.md) and set your time zone in the first lines.
- **Model**: any fast model (for example a "mini" / "flash" class model) keeps replies quick.
- **Voice / Transcriber**: pick a voice and language that suit your callers.
- **Tools**: add the 7 tools from step 3 (+ Transfer / End Call if you want).
- **Server URL** (Advanced → Server): `https://YOUR-APP/api/vapi/webhook` with the same credential.
- **Server messages**: keep `status-update`, `end-of-call-report` and `tool-calls` on.
- **Artifact plan**: turn on recording and transcript if you want them in the CRM.
- **Analysis**: keep the summary on (it becomes the call summary).

Copy the **Assistant ID** → portal **Settings → Vapi assistant id**.

The app sends these variables on outbound calls: `customerName`, `businessName`, `agentName`,
`company`, `city`, `notes`. Browser test calls send the same names.

## 5. Twilio number

1. Twilio → buy a voice-capable number (or use one you have).
2. Vapi → **Phone Numbers** → *Import* → Twilio → enter the number, Account SID and Auth Token.
3. On the imported number:
   - **Inbound**: choose your assistant (or leave empty and set the number's Server URL to the
     webhook: the app then answers `assistant-request` with the assistant from Settings).
   - **Server URL**: the webhook with the credential.
4. Copy the **Phone Number ID** → portal **Settings → Vapi phone number ids**. More numbers =
   comma separated; outbound calls take turns.

Outbound calls to some countries need Twilio geo-permissions (Twilio → Voice → Geo Permissions).

## 6. Test

1. Portal → **Test call** → *Start talking*. The call appears under **Calls → Browser tests** with
   transcript and summary when it ends.
2. Call your Twilio number from a phone → it appears under **Calls → Inbound**.
3. Add yourself as a contact with consent → **Call now** → your phone rings.
4. Turn on automatic calling in **Campaigns** when everything works.

## Troubleshooting

| Symptom | Check |
|---|---|
| Calls never appear in the portal | Server URL on assistant **and** phone number; credential token = `VAPI_WEBHOOK_SECRET`; Vercel logs show `401`? |
| Agent says "the system could not do that" | Tool Server URL / credential; Vercel logs `[vapi tool]` lines |
| "Vapi 401" on Call now | `VAPI_API_KEY` is the **private** key |
| "Vapi 400 … phoneNumberId" | Phone number id copied from Vapi (not the phone number itself) |
| Test call: microphone error | Allow the microphone; use https (Vercel) or localhost |
