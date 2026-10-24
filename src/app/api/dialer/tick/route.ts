import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { badSecret, blocked, requestIp } from "@/lib/rate-limit";
import { runDialer } from "@/lib/dialer";

/**
 * Dialer heartbeat. Vercel Cron calls this with `Authorization: Bearer CRON_SECRET` (see vercel.json);
 * any other scheduler (cron-job.org, GitHub Actions) can do the same.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const got = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(secret);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function tick(req: NextRequest) {
  const ip = requestIp(req.headers);
  if (blocked(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!authorized(req)) {
    badSecret(ip);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await runDialer();
  return NextResponse.json({ placed: r.placed, failed: r.failed, closedStale: r.closed, ready: r.status.ready, reasons: r.status.reasons });
}

export const GET = tick;
export const POST = tick;
