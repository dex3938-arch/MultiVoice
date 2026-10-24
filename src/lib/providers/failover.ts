/**
 * Provider failover rules (pure, unit-tested in test/failover.test.ts).
 *
 * Calls go to the first provider in Settings → providerOrder that is set up and not resting.
 * When a provider fails because of OUR side (no credits, bad key, rate limit, outage) it rests for a while
 * and the next provider takes the call. A request problem (e.g. a bad number) does not rest the provider.
 */

export const PROVIDERS = ["vapi", "dograh"] as const;
export type ProviderId = (typeof PROVIDERS)[number];
export const PROVIDER_LABEL: Record<ProviderId, string> = { vapi: "Vapi", dograh: "Dograh" };

export type FailureKind = "credits" | "auth" | "rate" | "down" | "request";

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderId,
    readonly kind: FailureKind,
    readonly status = 0,
  ) {
    super(message);
  }
}

const CREDIT_WORDS = /credit|balance|insufficient|payment|billing|funds|quota|subscription|upgrade your plan|out of minutes|wallet/i;

/** What kind of failure is this? `status` 0 = network error / timeout. */
export function classifyFailure(status: number, message = ""): FailureKind {
  if (status === 402 || CREDIT_WORDS.test(message)) return "credits";
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate";
  if (status === 0 || status >= 500) return "down";
  return "request";
}

/** Minutes a provider rests after a failure of this kind (0 = does not rest). */
export const REST_MINUTES: Record<FailureKind, number> = { credits: 360, auth: 30, rate: 2, down: 5, request: 0 };

/** The failure is ours, not the customer's: give the contact's attempt back. */
export const isOurSide = (kind: FailureKind) => kind !== "request";

export function parseOrder(order: string | null | undefined): ProviderId[] {
  const list = (order ?? "").split(/[\s,]+/).filter((p): p is ProviderId => (PROVIDERS as readonly string[]).includes(p));
  return [...new Set(list.length ? list : ["vapi", "dograh"])] as ProviderId[];
}

export type ProviderHealth = { configured: boolean; restingUntil: Date | null };

/** Providers to try now, in order: set up and not resting. */
export function usableProviders(order: ProviderId[], health: Record<ProviderId, ProviderHealth>, now = new Date()): ProviderId[] {
  return order.filter((p) => health[p]?.configured && !(health[p].restingUntil && health[p].restingUntil!.getTime() > now.getTime()));
}

/** Did the end-of-call reason say the provider could not run the call for billing reasons? */
export const endedForCredits = (reason: string | null | undefined) => Boolean(reason && CREDIT_WORDS.test(reason));
