/**
 * Pure dialer rules (no database), unit-tested in test/dialer-rules.test.ts.
 */

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Inside the calling window? Supports windows past midnight (e.g. 20:00–02:00). */
export function insideWindow(nowMinutes: number, start: string, end: string) {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return true;
  return s < e ? nowMinutes >= s && nowMinutes < e : nowMinutes >= s || nowMinutes < e;
}

export type DialCandidate = {
  status: string;
  consentAt: Date | null;
  attempts: number;
  lastAttemptAt: Date | null;
  nextCallAt: Date | null;
  /** Outcome of the latest call, if any. */
  lastOutcome: string | null;
};

const RETRY = ["NO_ANSWER", "BUSY", "VOICEMAIL", "FAILED"];

/**
 * Should this contact be dialled now?
 * - never DNC / LOST / WON / APPOINTMENT;
 * - a callback they asked for on a call is due → yes (asking for it is their consent for that call);
 * - otherwise only with recorded consent: never called → yes; last call did not reach them
 *   (no answer / busy / voicemail / failed) → retry after the gap, up to maxAttempts;
 *   a real conversation (inbound or outbound) → no more automatic calls.
 */
export function shouldDial(c: DialCandidate, rules: { maxAttempts: number; retryGapMinutes: number }, now = new Date()): boolean {
  if (["DNC", "LOST", "WON", "APPOINTMENT"].includes(c.status)) return false;
  if (c.nextCallAt) return c.nextCallAt.getTime() <= now.getTime() && c.attempts < rules.maxAttempts;
  if (!c.consentAt) return false;
  if (c.attempts >= rules.maxAttempts) return false;
  if (c.lastOutcome && !RETRY.includes(c.lastOutcome)) return false;
  if (!c.lastAttemptAt) return true;
  return now.getTime() - c.lastAttemptAt.getTime() >= rules.retryGapMinutes * 60_000;
}

/** Round-robin across the business's numbers. */
export const pickNumber = (ids: string[], counter: number) => (ids.length ? ids[Math.abs(counter) % ids.length] : null);
