import "server-only";
import { prisma } from "./db";
import { getSettings, phoneNumberIds, type AppSettings } from "./settings";
import { minutesIn, startOfDay } from "./util";
import { createVapiCall } from "./vapi";
import { insideWindow, pickNumber, shouldDial } from "./dialer-rules";
import { createDograhCall } from "./providers/dograh";
import { PROVIDER_LABEL, ProviderError, isOurSide, type FailureKind, type ProviderId } from "./providers/failover";
import { activeProviders, providerSetup, recordFailure, recordSuccess } from "./providers/state";

/**
 * Automatic outbound calling. Runs on each tick (Vercel Cron, "Run now", or the live-dialing toggle):
 * checks the rules, then places up to `maxConcurrent - live` calls. Each call goes to the first healthy
 * provider (Settings → provider order); if that one fails on our side (credits, key, outage) the next one
 * takes the same call straight away.
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

export async function dialerStatus(now = new Date()): Promise<DialerStatus & { providers: ProviderId[] }> {
  const s = await getSettings();
  const reasons: string[] = [];
  const [providers, setup] = await Promise.all([activeProviders(now), providerSetup()]);
  if (!providers.length) {
    const why = (Object.keys(setup) as ProviderId[]).map((p) => (setup[p].configured ? `${PROVIDER_LABEL[p]} is resting after an error` : `${PROVIDER_LABEL[p]} needs ${setup[p].missing.join(", ")}`));
    reasons.push(`No voice provider available: ${why.join("; ")}.`);
  }
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
  return { ready: reasons.length === 0, reasons, live, free, spentCents, budgetCents, inWindow, providers };
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
 * Call one contact. The Call row is written first (so the webhook always finds it). Providers are tried in
 * order; a provider that fails on our side rests and the next one takes the call. If every provider fails,
 * the row is marked FAILED and, when the cause is ours, the contact's attempt is given back.
 */
export async function dialContact(contactId: number, opts: { manual?: boolean } = {}) {
  const s = await getSettings();
  const providers = await activeProviders();
  if (!providers.length) throw new DialError("No voice provider is available (check Settings → Voice providers).", "auth");
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) throw new Error("Contact not found.");
  if (await prisma.doNotCall.findUnique({ where: { phone: contact.phone } })) throw new Error("This number is on the Do-Not-Call list.");
  if (contact.status === "DNC") throw new Error("This contact asked not to be called.");
  const callbackDue = Boolean(contact.nextCallAt && contact.nextCallAt <= new Date());
  if (!opts.manual && !contact.consentAt && !callbackDue) throw new Error("No calling consent recorded.");

  // Atomic claim: if two ticks pick the same contact at once, only one of them places the call.
  const claim = await prisma.contact.updateMany({
    where: { id: contactId, attempts: contact.attempts },
    // A due callback is consumed by this attempt; a fresh one is set if they ask again.
    data: { attempts: { increment: 1 }, lastAttemptAt: new Date(), ...(callbackDue ? { nextCallAt: null } : {}) },
  });
  if (claim.count !== 1) throw new Error("This contact is already being called.");
  const row = await prisma.call.create({ data: { direction: "OUTBOUND", provider: providers[0], contactId, toNumber: contact.phone, status: "queued" } });

  const context = {
    customerName: contact.name ?? "",
    businessName: s.businessName,
    agentName: s.agentName,
    company: contact.company ?? "",
    city: contact.city ?? "",
    notes: (contact.notes ?? "").slice(0, 500),
  };
  const errors: { provider: ProviderId; kind: FailureKind; message: string }[] = [];
  for (const provider of providers) {
    try {
      if (row.provider !== provider) await prisma.call.update({ where: { id: row.id }, data: { provider } });
      const placed = await placeWith(provider, s, contact.phone, contact.name, contact.id, context);
      // The webhook may have attached the id already (it can be faster than this response).
      await prisma.call.updateMany({ where: { id: row.id, externalId: null }, data: { externalId: placed.id } });
      await recordSuccess(provider);
      return { ...row, provider, failedOver: errors.length > 0 };
    } catch (e) {
      const pe = e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : "error", provider, "down");
      errors.push({ provider, kind: pe.kind, message: pe.message });
      await recordFailure(provider, pe.kind, pe.message);
      // A problem with this customer's number would fail everywhere: do not burn the other provider.
      if (pe.kind === "request" && providers.length > 1 && /number|phone|e\.?164|invalid customer/i.test(pe.message)) break;
    }
  }
  const reason = errors.map((x) => `${PROVIDER_LABEL[x.provider]}: ${x.message}`).join(" | ");
  await prisma.call.update({ where: { id: row.id }, data: { status: "ended", endedAt: new Date(), outcome: "FAILED", endedReason: reason.slice(0, 80) } });
  const ours = errors.every((x) => isOurSide(x.kind));
  if (ours) {
    // Credits, keys or an outage, not the customer: give the attempt and the callback back.
    await prisma.contact.update({ where: { id: contactId }, data: { attempts: contact.attempts, lastAttemptAt: contact.lastAttemptAt, nextCallAt: contact.nextCallAt } });
  }
  throw new DialError(reason || "The call could not be placed.", ours ? errors[errors.length - 1].kind : "request");
}

async function placeWith(provider: ProviderId, s: AppSettings, phone: string, name: string | null, contactId: number, context: Record<string, string>) {
  if (provider === "vapi") {
    const numbers = phoneNumberIds(s);
    const callsSoFar = await prisma.call.count({ where: { direction: "OUTBOUND", provider: "vapi" } });
    return createVapiCall({
      assistantId: s.vapiAssistantId!,
      phoneNumberId: pickNumber(numbers, callsSoFar)!,
      customer: { number: phone, name: name ?? undefined },
      variableValues: context,
      name: `contact-${contactId}`,
    });
  }
  return createDograhCall({
    baseUrl: s.dograhBaseUrl,
    agentUuid: s.dograhAgentUuid!,
    phoneNumber: phone,
    context: { ...context, phone_number: phone, direction: "outbound", contact_id: String(contactId) },
    telephonyConfigId: s.dograhTelephonyConfigId,
    fromNumberId: s.dograhFromNumberId,
  });
}

/** Every provider failed. `kind` tells the dialer whether to stop the round (our side) or go on. */
export class DialError extends Error {
  constructor(message: string, readonly kind: FailureKind) {
    super(message);
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
    } catch (e) {
      failed++;
      // No provider can take calls right now: stop instead of failing every contact in the queue.
      if (e instanceof DialError && isOurSide(e.kind) && !(await activeProviders()).length)
        return { placed, failed, closed, status: { ...status, ready: false, reasons: [`All voice providers are resting: ${e.message}`] } };
    }
  }
  return { placed, failed, closed, status };
}
