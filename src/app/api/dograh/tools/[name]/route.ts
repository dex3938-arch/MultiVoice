import { NextResponse, type NextRequest } from "next/server";
import { badSecret, blocked, requestIp } from "@/lib/rate-limit";
import { runTool, type CallRef } from "@/lib/calls";
import { clean } from "@/lib/call-logic";
import { webhookAuthorized } from "@/lib/vapi";

/**
 * Dograh "HTTP API" tools → here, one URL per tool: /api/dograh/tools/search_knowledge, …/book_appointment …
 * The same 7 tools (and the same rules) as Vapi. Auth: Bearer DOGRAH_WEBHOOK_SECRET. Body: the tool's
 * parameters + preset `workflow_run_id` (and `phone` if your agent has it).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 20;

export async function POST(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const ip = requestIp(req.headers);
  if (blocked(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!webhookAuthorized(req.headers, "DOGRAH_WEBHOOK_SECRET")) {
    badSecret(ip);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name } = await params;
  const raw = await req.text();
  if (raw.length > 100_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let body: Record<string, unknown> = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  const runId = clean(body.workflow_run_id ?? body.run_id, 60);
  const { workflow_run_id: _a, run_id: _b, phone, direction, ...args } = body;
  void _a;
  void _b;
  const dir = String(clean(direction) ?? "").toLowerCase();
  const ref: CallRef | null =
    runId && /^[\w-]{1,60}$/.test(runId)
      ? { provider: "dograh", externalId: `dograh:${runId}`, direction: dir.startsWith("out") ? "OUTBOUND" : "INBOUND", customerNumber: clean(phone, 30) }
      : null;
  try {
    const result = await runTool(ref, name.slice(0, 40), args);
    // Dograh passes the parsed JSON body to the agent as `data`.
    return NextResponse.json(JSON.parse(result));
  } catch (e) {
    console.error("[dograh tool]", name, e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "The system could not do that right now. Offer a callback from the team instead." });
  }
}
