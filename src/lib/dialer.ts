import "server-only";
import { prisma } from "./db";
import { getSettings, phoneNumberIds, type AppSettings } from "./settings";
import { minutesIn, startOfDay } from "./util";
import { createVapiCall, vapiConfigured } from "./vapi";
import { insideWindow, pickNumber, shouldDial } from "./dialer-rules";

/**
 * Automatic outbound calling. Runs on each tick (Vercel Cron, "Run now", or the live-dialing toggle):
 * checks the rules, then places up to `maxConcurrent - live` calls through Vapi.
 */

const LIVE = ["queued", "ringing", "in-progress", "forwarding"];

/** A call with no "ended" webhook for 45 minutes is closed so it stops counting as live. */
export async function closeStaleCalls(now = new Date()) {
  const cutoff = new Date(now.getTime() - 45 * 60_000);
  const res = await prisma.call.updateMany({
    where: { endedAt: null, startedAt: { lt: cutoff } },
    data: { status: "ended", endedAt: now, outcome: "FAILED", endedReason: "no-end-report" },
  });
  return res.count;
}

export async function monthSpendCents(s: AppSettings, now = new Date()) {
  const today = startOfDay(s.timezone, now);
  const monthStart = new Date(today.getTime() - (Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: s.timezone }).format(now)) - 1) * 86_400_000);
  const r = await prisma.call.aggregate({ _sum: { costCents: true }, where: { startedAt: { gte: monthStart } } });
  return r._sum.costCents ?? 0;
}

export type DialerStatus = {
  ready: boolean;
  reasons: string[];
  live: number;
  free: number;
  spentCents: number;
  budgetCents: number;
  inWindow: boolean;
};

export async function dialerStatus(now = new Date()): Promise<DialerStatus> {
  const s = await getSettings();
  const reasons: string[] = [];
  if (!vapiConfigured()) reasons.push("VAPI_API_KEY is not set on the server.");
  if (!s.vapiAssistantId) reasons.push("No Vapi assistant id in Settings.");
  if (!phoneNumberIds(s).length) reasons.push("No Vapi phone number id in Settings.");
  if (!s.outboundEnabled) reasons.push("Automatic calling is switched off in Settings.");
  const inWindow = insideWindow(minutesIn(s.timezone, now), s.callingStart, s.callingEnd);
  if (!inWindow) reasons.push(`Outside calling hours (${s.callingStart}–${s.callingEnd}, ${s.timezone}).`);
  const [live, spentCents] = await Promise.all([
    prisma.call.count({ where: { endedAt: null, status: { in: LIVE }, isTest: false } }),
    monthSpendCents(s, now),
  ]);
  const budgetCents = s.monthlyBudgetUsd * 100;
  if (spentCents >= budgetCents) reasons.push("Monthly budget reached.");
  const free = Math.max(0, s.maxConcurrent - live);
  return { ready: reasons.length === 0, reasons, live, free, spentCents, budgetCents, inWindow };
}

/** Contacts the dialer would call now, oldest first, callbacks first. */
export async function dueContacts(limit: number, now = new Date()) {
  const s = await getSettings();
  const dnc = new Set((await prisma.doNotCall.findMany({ select: { phone: true } })).map((d) => d.phone));
  const pool = await prisma.contact.findMany({
    where: {
      status: { notIn: ["DNC", "LOST", "WON", "APPOINTMENT"] },
      attempts: { lt: s.maxAttempts },
      // A due callback, or a contact with consent and nothing scheduled.
      OR: [{ nextCallAt: { lte: now } }, { nextCallAt: null, consentAt: { not: null } }],
      // Nobody with a live call right now.
      calls: { none: { endedAt: null, status: { in: LIVE } } },
    },
    orderBy: [{ nextCallAt: { sort: "asc", nulls: "last" } }, { lastAttemptAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    take: Math.max(limit * 5, 25),
    include: { calls: { where: { isTest: false }, orderBy: { startedAt: "desc" }, take: 1, select: { outcome: true } } },
  });
  return pool
    .filter((c) => !dnc.has(c.phone))
    .filter((c) => shouldDial({ ...c, lastOutcome: c.calls[0]?.outcome ?? null }, s, now))
    .slice(0, limit);
}

/**
 * Call one contact. The Call row is written first (so the webhook always finds it); if Vapi refuses,
 * the row is marked FAILED with the reason.
 */
export async function dialContact(contactId: number, opts: { manual?: boolean } = {}) {
  const s = await getSettings();
  const numbers = phoneNumberIds(s);
  if (!vapiConfigured() || !s.vapiAssistantId || !numbers.length) throw new Error("Vapi is not set up yet (API key, assistant id and phone number id).");
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error("Contact not found.");
  if (await prisma.doNotCall.findUnique({ where: { phone: contact.phone } })) throw new Error("This number is on the Do-Not-Call list.");
  if (contact.status === "DNC") throw new Error("This contact asked not to be called.");
  const callbackDue = Boolean(contact.nextCallAt && contact.nextCallAt <= new Date());
  if (!opts.manual && !contact.consentAt && !callbackDue) throw new Error("No calling consent recorded.");

  const callsSoFar = await prisma.call.count({ where: { direction: "OUTBOUND" } });
  const phoneNumberId = pickNumber(numbers, callsSoFar)!;
  // Atomic claim: if two ticks pick the same contact at once, only one of them places the call.
  const claim = await prisma.contact.updateMany({
    where: { id: contactId, attempts: contact.attempts },
    // A due callback is consumed by this attempt; a fresh one is set if they ask again.
    data: { attempts: { increment: 1 }, lastAttemptAt: new Date(), ...(callbackDue ? { nextCallAt: null } : {}) },
  });
  if (claim.count !== 1) throw new Error("This contact is already being called.");
  const row = await prisma.call.create({ data: { direction: "OUTBOUND", contactId, toNumber: contact.phone, status: "queued" } });
  try {
    const vapi = await createVapiCall({
      assistantId: s.vapiAssistantId,
      phoneNumberId,
      customer: { number: contact.phone, name: contact.name ?? undefined },
      variableValues: {
        customerName: contact.name ?? "",
        businessName: s.businessName,
        agentName: s.agentName,
        company: contact.company ?? "",
        city: contact.city ?? "",
        notes: (contact.notes ?? "").slice(0, 500),
      },
      name: `contact-${contact.id}`,
    });
    // The webhook may have attached the id already (it can be faster than this response).
    await prisma.call.updateMany({ where: { id: row.id, vapiCallId: null }, data: { vapiCallId: vapi.id } });
    return row;
  } catch (e) {
    const reason = e instanceof Error ? e.message : "Vapi error";
    await prisma.call.update({ where: { id: row.id }, data: { status: "ended", endedAt: new Date(), outcome: "FAILED", endedReason: reason.slice(0, 80) } });
    throw e;
  }
}

/** One dialer round. Safe to run often; never exceeds the concurrency limit or the budget. */
export async function runDialer(now = new Date()) {
  const closed = await closeStaleCalls(now);
  const status = await dialerStatus(now);
  if (!status.ready || status.free === 0) return { placed: 0, failed: 0, closed, status };
  const due = await dueContacts(Math.min(status.free, 10), now);
  let placed = 0;
  let failed = 0;
  for (const c of due) {
    try {
      await dialContact(c.id);
      placed++;
    } catch {
      failed++;
    }
  }
  return { placed, failed, closed, status };
}
