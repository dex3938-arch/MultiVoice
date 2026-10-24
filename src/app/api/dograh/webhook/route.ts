import { NextResponse, type NextRequest } from "next/server";
import { badSecret, blocked, requestIp } from "@/lib/rate-limit";
import { onEndOfCall, onStatusUpdate, type CallRef } from "@/lib/calls";
import { parseTranscript, readDograhPayload } from "@/lib/call-logic";
import { getSettings } from "@/lib/settings";
import { recordSuccess } from "@/lib/providers/state";
import { webhookAuthorized } from "@/lib/vapi";

/**
 * Dograh "Webhook" node (end of every call) → here. Auth: Bearer DOGRAH_WEBHOOK_SECRET (Dograh credential
 * type BEARER_TOKEN). Body: dograh/webhook-template.json.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Fetch the transcript only from Dograh's own hosts (no requests to arbitrary URLs). */
async function fetchTranscript(url: string, base: string) {
  try {
    const u = new URL(url);
    const allowed = new Set(["app.dograh.com", "api.dograh.com", new URL(base).host]);
    if (u.protocol !== "https:" || !allowed.has(u.host)) return [];
    const res = await fetch(u, { headers: { "X-API-Key": process.env.DOGRAH_API_KEY ?? "" }, signal: AbortSignal.timeout(6000), cache: "no-store", redirect: "error" });
    if (!res.ok) return [];
    const text = (await res.text()).slice(0, 400_000);
    return parseTranscript(text);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const ip = requestIp(req.headers);
  if (blocked(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!webhookAuthorized(req.headers, "DOGRAH_WEBHOOK_SECRET")) {
    badSecret(ip);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = await req.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const ev = readDograhPayload(body);
  if (!ev.runId) return NextResponse.json({ error: "run_id missing" }, { status: 422 });
  try {
    const ref: CallRef = { provider: "dograh", externalId: `dograh:${ev.runId}`, direction: ev.direction ?? "INBOUND", customerNumber: ev.phone, startedAt: ev.report.startedAt };
    const event = String(body.event ?? "call_ended");
    if (event === "call_started") {
      await recordSuccess("dograh");
      await onStatusUpdate(ref, "in-progress");
      return NextResponse.json({ ok: true });
    }
    if (!ev.report.messages.length && ev.transcriptUrl) ev.report.messages = await fetchTranscript(ev.transcriptUrl, (await getSettings()).dograhBaseUrl);
    if (ev.report.messages.some((m) => m.role === "user")) ev.report.customerSpoke = true;
    await recordSuccess("dograh");
    await onEndOfCall(ref, ev.report);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[dograh webhook]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
