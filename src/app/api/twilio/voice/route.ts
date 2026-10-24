import { NextResponse, type NextRequest } from "next/server";
import { badSecret, blocked, requestIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { activeProviders } from "@/lib/providers/state";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { redirectTo, sayAndHangUp, twilioValid } from "@/lib/twilio";

/**
 * Inbound router. Set the Twilio number's Voice URL to https://YOUR-APP/api/twilio/voice (npm run vapi:setup
 * does it when Dograh is configured). Each incoming call is handed to the first healthy provider:
 * Vapi normally, Dograh when Vapi is resting (no credits, outage). Only Twilio-signed requests are served.
 */
export const dynamic = "force-dynamic";

const xml = (body: string) => new NextResponse(body, { headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 20_000) return new NextResponse("Too large", { status: 413 });
  const params = Object.fromEntries(new URLSearchParams(raw));
  // Twilio signs the public URL it called (Vercel may see a different internal URL).
  const url = `${siteUrl()}/api/twilio/voice`;
  const ip = requestIp(req.headers);
  if (blocked(ip)) return new NextResponse("Too many requests", { status: 429 });
  if (!twilioValid(process.env.TWILIO_AUTH_TOKEN?.trim(), req.headers.get("x-twilio-signature"), url, params)) {
    badSecret(ip);
    return new NextResponse("Forbidden", { status: 403 });
  }
  const s = await getSettings();
  const order = await activeProviders();
  for (const p of order) {
    const target = p === "vapi" ? s.vapiInboundUrl : s.dograhInboundUrl;
    if (target && /^https:\/\//.test(target)) {
      await prisma.auditLog.create({ data: { action: "inbound.route", entity: "Provider", entityId: p, detail: { to: String(params.To ?? "").slice(-4), callSid: String(params.CallSid ?? "").slice(0, 40) } } });
      return xml(redirectTo(target));
    }
  }
  return xml(sayAndHangUp(`Sorry, ${s.businessName} cannot take your call right now. Please try again later.`));
}
