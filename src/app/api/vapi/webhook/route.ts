import { NextResponse, type NextRequest } from "next/server";
import { ensureCall, onEndOfCall, onStatusUpdate, runTool } from "@/lib/calls";
import { getSettings } from "@/lib/settings";
import { webhookAuthorized, type VapiCall } from "@/lib/vapi";

/**
 * Vapi "Server URL". Set it to https://YOUR-APP/api/vapi/webhook with a Bearer Token credential
 * equal to VAPI_WEBHOOK_SECRET (see docs/VAPI-SETUP.md). Anything without that secret is refused.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 1_000_000;

type ToolCall = { id?: string; type?: string; function?: { name?: string; arguments?: unknown }; name?: string; arguments?: unknown };

export async function POST(req: NextRequest) {
  if (!webhookAuthorized(req.headers)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });

  let body: { message?: Record<string, unknown> & { type?: string; call?: VapiCall } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const message = body.message;
  const call = (message?.call ?? {}) as VapiCall;
  if (!message?.type) return NextResponse.json({ ok: true });

  try {
    switch (message.type) {
      case "assistant-request": {
        // Inbound call on a number with no fixed assistant: answer with the one from Settings.
        const s = await getSettings();
        await ensureCall(call);
        return s.vapiAssistantId
          ? NextResponse.json({ assistantId: s.vapiAssistantId })
          : NextResponse.json({ error: "No assistant configured. Please call again later." });
      }
      case "status-update":
        await onStatusUpdate(call, String(message.status ?? ""));
        return NextResponse.json({ ok: true });
      case "end-of-call-report":
        await onEndOfCall(call, message);
        return NextResponse.json({ ok: true });
      case "tool-calls": {
        const list = ((message.toolCallList ?? message.toolCalls ?? []) as ToolCall[]).slice(0, 10);
        const results = [];
        for (const t of list) {
          const name = t.function?.name ?? t.name ?? "";
          let result: string;
          try {
            result = await runTool(call, name, t.function?.arguments ?? t.arguments);
          } catch (e) {
            console.error("[vapi tool]", name, e instanceof Error ? e.message : e);
            result = JSON.stringify({ error: "The system could not do that right now. Offer a callback from the team instead." });
          }
          results.push({ name, toolCallId: t.id ?? "", result });
        }
        return NextResponse.json({ results });
      }
      default:
        // transcript, speech-update, conversation-update, hang … nothing to store mid-call.
        return NextResponse.json({ ok: true });
    }
  } catch (e) {
    console.error("[vapi webhook]", message.type, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
