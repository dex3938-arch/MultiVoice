#!/usr/bin/env node
/**
 * Connects Twilio + Vapi to this app in one go (safe to run again, it updates instead of duplicating):
 *
 *   npm run vapi:setup
 *
 * 1. checks the Twilio account and that your Twilio number(s) exist on it
 * 2. creates / updates the 7 tools in Vapi (pointing at APP_URL/api/vapi/webhook with your secret)
 * 3. creates / updates the assistant (prompt from vapi/assistant-prompt.md)
 * 4. imports the Twilio number(s) into Vapi and attaches the assistant for inbound calls
 * 5. saves the assistant id and phone number ids in Settings (database)
 * 6. with DOGRAH_API_KEY set: checks the Dograh key and points the Twilio number(s) at this app's inbound
 *    router (/api/twilio/voice), so inbound calls go to Vapi and fall back to Dograh
 *
 * Needs in .env: VAPI_API_KEY, VAPI_WEBHOOK_SECRET, APP_URL (public https address, not localhost),
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBERS, DATABASE_URL.
 * Keys are only sent to api.vapi.ai and api.twilio.com.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, ".env")) && typeof process.loadEnvFile === "function") process.loadEnvFile(join(root, ".env"));

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const fail = (msg) => {
  console.error(red(`\n✗ ${msg}\n`));
  process.exit(1);
};

const env = (k) => process.env[k]?.trim() ?? "";
const VAPI_KEY = env("VAPI_API_KEY");
const SECRET = env("VAPI_WEBHOOK_SECRET");
const APP_URL = env("APP_URL").replace(/\/$/, "");
const TW_SID = env("TWILIO_ACCOUNT_SID");
const TW_TOKEN = env("TWILIO_AUTH_TOKEN");
const TW_NUMBERS = env("TWILIO_PHONE_NUMBERS").split(/[\s,]+/).filter(Boolean);
const ASSISTANT_NAME = env("VAPI_ASSISTANT_NAME") || "MultiVoice Agent";
const MODEL = env("VAPI_MODEL") || "gpt-4o-mini";

if (!VAPI_KEY) fail("VAPI_API_KEY is missing in .env (Vapi → API Keys → Private).");
if (SECRET.length < 24) fail("VAPI_WEBHOOK_SECRET must be 24+ characters (npm run setup creates one).");
if (!/^https:\/\//.test(APP_URL) || /localhost|127\.0\.0\.1/.test(APP_URL)) fail("APP_URL must be your public https address (e.g. https://your-app.vercel.app). Vapi cannot reach localhost.");
if (!TW_SID || !TW_TOKEN) fail("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are missing in .env (Twilio Console → Account info).");
if (!TW_NUMBERS.length) fail("TWILIO_PHONE_NUMBERS is missing in .env (your Twilio number(s) in +E.164, comma separated).");
for (const n of TW_NUMBERS) if (!/^\+\d{8,15}$/.test(n)) fail(`"${n}" is not in +E.164 format (e.g. +14155550123).`);

const WEBHOOK = `${APP_URL}/api/vapi/webhook`;
const server = { url: WEBHOOK, timeoutSeconds: 20, headers: { Authorization: `Bearer ${SECRET}` } };

async function vapi(method, path, body) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    method,
    headers: { Authorization: `Bearer ${VAPI_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { message: text.slice(0, 300) };
  }
  if (!res.ok) {
    const msg = Array.isArray(json.message) ? json.message.join("; ") : json.message ?? text.slice(0, 300);
    fail(`Vapi ${method} ${path} → ${res.status}: ${msg}`);
  }
  return json;
}

async function twilio(path, form) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(TW_SID)}${path}`, {
    method: form ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString("base64")}`, ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}) },
    body: form ? new URLSearchParams(form).toString() : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401) fail("Twilio refused the Account SID / Auth Token. Copy them again from the Twilio Console.");
  if (!res.ok) fail(`Twilio ${path} → ${res.status}`);
  return res.json();
}

async function main() {
  console.log(bold("\nMultiVoice: connecting Twilio + Vapi\n"));
  const prisma = new PrismaClient();
  try {
    const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

    // 0. Vapi key
    const probe = await fetch("https://api.vapi.ai/assistant?limit=1", { headers: { Authorization: `Bearer ${VAPI_KEY}` }, signal: AbortSignal.timeout(20_000) });
    if (probe.status === 401 || probe.status === 403) fail("Vapi refused VAPI_API_KEY. Use the PRIVATE key from Vapi → API Keys.");
    console.log(green("✓ Vapi key accepted"));

    // 1. Twilio
    const account = await twilio(".json");
    console.log(green(`✓ Twilio account: ${account.friendly_name} (${account.status}${account.type === "Trial" ? ", TRIAL: can only call verified numbers" : ""})`));
    const twilioSids = {};
    for (const n of TW_NUMBERS) {
      const list = await twilio(`/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(n)}`);
      const found = list.incoming_phone_numbers?.[0];
      if (!found) fail(`${n} is not a number on this Twilio account.`);
      if (found.capabilities && found.capabilities.voice === false) fail(`${n} has no voice capability on Twilio.`);
      twilioSids[n] = found.sid;
      console.log(green(`✓ Twilio number ${n} found`));
    }

    // 2. Tools (matched by name, so re-running updates them)
    const defs = JSON.parse(readFileSync(join(root, "vapi", "tools.json"), "utf8"));
    const existing = await vapi("GET", "/tool?limit=100");
    const toolIds = [];
    for (const def of defs) {
      const name = def.function.name;
      const body = { function: def.function, server, async: false };
      const match = (Array.isArray(existing) ? existing : []).find((t) => t.type === "function" && t.function?.name === name);
      const tool = match ? await vapi("PATCH", `/tool/${match.id}`, body) : await vapi("POST", "/tool", { type: "function", ...body });
      toolIds.push(tool.id);
      console.log(green(`✓ tool ${name} ${match ? "updated" : "created"}`));
    }

    // 3. Assistant
    const prompt = readFileSync(join(root, "vapi", "assistant-prompt.md"), "utf8").replace(/"Asia\/Kolkata"/g, JSON.stringify(settings.timezone));
    const assistantBody = {
      name: ASSISTANT_NAME,
      firstMessageMode: "assistant-speaks-first",
      firstMessage: `Hello, this is {{agentName}} from {{businessName}}. How can I help you today?`,
      model: { provider: "openai", model: MODEL, temperature: 0.3, maxTokens: 220, messages: [{ role: "system", content: prompt }], toolIds },
      server,
      serverMessages: ["status-update", "end-of-call-report", "tool-calls"],
      artifactPlan: { recordingEnabled: true },
      endCallPhrases: ["goodbye", "bye bye", "have a nice day"],
      maxDurationSeconds: 900,
    };
    const assistants = await vapi("GET", "/assistant?limit=100");
    const current = (Array.isArray(assistants) ? assistants : []).find((a) => a.id === settings.vapiAssistantId) ?? (Array.isArray(assistants) ? assistants : []).find((a) => a.name === ASSISTANT_NAME);
    // Keep the voice / transcriber chosen in the dashboard; only the brain, tools and webhook are managed here.
    const assistant = current ? await vapi("PATCH", `/assistant/${current.id}`, assistantBody) : await vapi("POST", "/assistant", assistantBody);
    console.log(green(`✓ assistant "${ASSISTANT_NAME}" ${current ? "updated" : "created"} (${assistant.id})`));

    // 4. Twilio numbers → Vapi
    const numbers = await vapi("GET", "/phone-number?limit=100");
    const phoneIds = [];
    for (const n of TW_NUMBERS) {
      const match = (Array.isArray(numbers) ? numbers : []).find((p) => p.number === n);
      const body = { assistantId: assistant.id, server, name: `MultiVoice ${n}`.slice(0, 40) };
      const pn = match
        ? await vapi("PATCH", `/phone-number/${match.id}`, body)
        : await vapi("POST", "/phone-number", { provider: "twilio", number: n, twilioAccountSid: TW_SID, twilioAuthToken: TW_TOKEN, smsEnabled: false, ...body });
      phoneIds.push(pn.id);
      console.log(green(`✓ ${n} ${match ? "updated in" : "imported into"} Vapi (${pn.id})`));
    }

    // Vapi set the Twilio Voice URL to its own inbound endpoint: remember it for the inbound router.
    let vapiInboundUrl = settings.vapiInboundUrl;
    const first = await twilio(`/IncomingPhoneNumbers/${twilioSids[TW_NUMBERS[0]]}.json`);
    if (first.voice_url && /^https:\/\//.test(first.voice_url) && !first.voice_url.startsWith(APP_URL)) vapiInboundUrl = first.voice_url;

    // 5. Settings
    await prisma.settings.update({ where: { id: 1 }, data: { vapiAssistantId: assistant.id, vapiPhoneNumbers: phoneIds.join(","), vapiInboundUrl } });
    console.log(green("✓ saved assistant id, phone number ids and Vapi inbound URL in Settings"));

    // 6. Dograh (optional backup provider)
    const DOGRAH_KEY = env("DOGRAH_API_KEY");
    if (DOGRAH_KEY) {
      const base = (settings.dograhBaseUrl || "https://app.dograh.com").replace(/\/$/, "");
      try {
        const r = await fetch(`${base}/api/v1/workflow/fetch`, { headers: { "X-API-Key": DOGRAH_KEY }, signal: AbortSignal.timeout(15_000) });
        if (r.status === 401 || r.status === 403) console.log(red(`! Dograh refused DOGRAH_API_KEY (${base}). Check Dograh → Settings → API Keys.`));
        else if (r.ok) {
          const j = await r.json().catch(() => null);
          const list = Array.isArray(j) ? j : Array.isArray(j?.workflows) ? j.workflows : [];
          console.log(green(`✓ Dograh key accepted${list.length ? `, agents: ${list.slice(0, 5).map((w) => `${w.name ?? "agent"} (${w.workflow_uuid ?? w.uuid ?? w.id})`).join(", ")}` : ""}`));
        } else console.log(`• Dograh answered ${r.status}; the key is checked again on the first call.`);
      } catch {
        console.log(red(`! Could not reach Dograh at ${base}.`));
      }
      if (!settings.dograhAgentUuid) console.log(`• Put your Dograh agent UUID in portal Settings → Voice providers.`);
      if (settings.inboundRouter && env("INBOUND_ROUTER") !== "off") {
        if (!env("TWILIO_AUTH_TOKEN")) fail("TWILIO_AUTH_TOKEN is needed for the inbound router.");
        for (const n of TW_NUMBERS) {
          await twilio(`/IncomingPhoneNumbers/${twilioSids[n]}.json`, { VoiceUrl: `${APP_URL}/api/twilio/voice`, VoiceMethod: "POST" });
          console.log(green(`✓ ${n}: inbound calls now go through ${APP_URL}/api/twilio/voice (Vapi, then Dograh)`));
        }
        console.log("  Add TWILIO_AUTH_TOKEN to Vercel too: the router uses it to check Twilio's signature.");
        console.log("  If you later save an inbound workflow in Dograh, it overwrites the Twilio Voice URL: run this command again.");
      }
    }

    console.log(bold(green("\n✓ Twilio + Vapi connected\n")));
    console.log(`Webhook:   ${WEBHOOK}`);
    console.log(`Inbound:   call ${TW_NUMBERS.join(" / ")} → the assistant answers`);
    console.log(`Outbound:  portal → Contacts → Call now, or Campaigns`);
    console.log(`Browser:   portal → Test call (needs NEXT_PUBLIC_VAPI_PUBLIC_KEY)`);
    console.log(`Voice:     pick a voice / language in Vapi → Assistants → ${ASSISTANT_NAME} (kept on re-runs)\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => fail(e?.message ?? String(e)));
