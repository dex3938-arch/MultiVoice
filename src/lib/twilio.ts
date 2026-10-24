import "server-only";
import { createHmac } from "node:crypto";
import { same } from "./vapi";

/**
 * Twilio request signature (X-Twilio-Signature): HMAC-SHA1 of the full URL + the POST params sorted by
 * name (key + value concatenated), base64, keyed with the Auth Token. Proves the request came from Twilio.
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>) {
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  return createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");
}

export function twilioValid(authToken: string | undefined, signature: string | null, url: string, params: Record<string, string>) {
  if (!authToken || !signature) return false;
  return same(twilioSignature(authToken, url, params), signature);
}

const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

export const twiml = (inner: string) => `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
export const redirectTo = (url: string) => twiml(`<Redirect method="POST">${esc(url)}</Redirect>`);
export const sayAndHangUp = (text: string) => twiml(`<Say>${esc(text)}</Say><Hangup/>`);
