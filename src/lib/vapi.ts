import "server-only";
import { timingSafeEqual } from "node:crypto";
import { ProviderError, classifyFailure } from "./providers/failover";

/**
 * Vapi runs the conversation (speech-to-text, the AI model, the voice) and the phone line (a Twilio number
 * imported into Vapi by `npm run vapi:setup`). This app places outbound calls through Vapi's API and receives every call event on
 * /api/vapi/webhook. The private API key never leaves the server.
 */

/** VAPI_API_BASE: only for tests against a mock server. */
const BASE = process.env.VAPI_API_BASE?.trim() || "https://api.vapi.ai";

export const vapiConfigured = () => Boolean(process.env.VAPI_API_KEY?.trim());

export type VapiCustomer = { number?: string; name?: string };
export type VapiCall = {
  id?: string;
  type?: string; // inboundPhoneCall | outboundPhoneCall | webCall
  status?: string;
  phoneNumberId?: string;
  assistantId?: string;
  customer?: VapiCustomer;
  phoneNumber?: { number?: string };
  startedAt?: string;
  endedAt?: string;
  cost?: number;
};

/** Vapi failures carry a kind (credits, auth, rate, down, request) so the next provider can take over. */
export class VapiError extends ProviderError {
  constructor(message: string, status: number) {
    super(message, "vapi", classifyFailure(status, message), status);
  }
}

/** Place an outbound call. Returns the Vapi call id. */
export async function createVapiCall(input: {
  assistantId: string;
  phoneNumberId: string;
  customer: { number: string; name?: string };
  variableValues?: Record<string, string>;
  name?: string;
}): Promise<{ id: string; status?: string }> {
  const key = process.env.VAPI_API_KEY?.trim();
  if (!key) throw new VapiError("VAPI_API_KEY is not set on the server", 401);
  let res: Response;
  try {
    res = await fetch(`${BASE}/call`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        assistantId: input.assistantId,
        phoneNumberId: input.phoneNumberId,
        customer: { number: input.customer.number, ...(input.customer.name ? { name: input.customer.name.slice(0, 40) } : {}) },
        ...(input.variableValues ? { assistantOverrides: { variableValues: input.variableValues } } : {}),
        ...(input.name ? { name: input.name.slice(0, 40) } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new VapiError(`Vapi unreachable: ${e instanceof Error ? e.message : "network error"}`, 0);
  }
  const text = await res.text();
  let j: { id?: string; status?: string; message?: string | string[] } = {};
  try {
    j = JSON.parse(text);
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || !j.id) {
    const msg = Array.isArray(j.message) ? j.message.join("; ") : j.message ?? text.slice(0, 200);
    throw new VapiError(`Vapi ${res.status}: ${msg}`, res.ok ? 400 : res.status);
  }
  return { id: j.id, status: j.status };
}

export const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

/**
 * Webhook authentication. In Vapi, create a Bearer Token credential (Dashboard → Integrations → Server
 * Configuration) with the same value as VAPI_WEBHOOK_SECRET. Vapi then sends `Authorization: Bearer <secret>`.
 * The older `x-vapi-secret` header is accepted too. Without a configured secret every request is refused.
 */
export function webhookAuthorized(headers: Headers, envName = "VAPI_WEBHOOK_SECRET"): boolean {
  const secret = process.env[envName]?.trim();
  if (!secret || secret.length < 24) return false;
  const auth = headers.get("authorization") ?? "";
  const bearer = /^bearer\s+/i.test(auth) ? auth.replace(/^bearer\s+/i, "").trim() : "";
  return same(bearer, secret) || same(headers.get("x-vapi-secret") ?? "", secret) || same(headers.get("x-api-key") ?? "", secret);
}
