import { describe, expect, it } from "vitest";
import { insideWindow, pickNumber, shouldDial, type DialCandidate } from "../src/lib/dialer-rules";

const rules = { maxAttempts: 3, retryGapMinutes: 240 };
const now = new Date("2026-10-20T10:00:00Z");
const base: DialCandidate = { status: "NEW", consentAt: new Date("2026-10-01"), attempts: 0, lastAttemptAt: null, nextCallAt: null, lastOutcome: null };
const ago = (min: number) => new Date(now.getTime() - min * 60_000);

describe("calling window", () => {
  it("handles normal and overnight windows", () => {
    expect(insideWindow(9 * 60, "09:00", "21:00")).toBe(true);
    expect(insideWindow(21 * 60, "09:00", "21:00")).toBe(false);
    expect(insideWindow(8 * 60 + 59, "09:00", "21:00")).toBe(false);
    expect(insideWindow(23 * 60, "20:00", "02:00")).toBe(true);
    expect(insideWindow(60, "20:00", "02:00")).toBe(true);
    expect(insideWindow(12 * 60, "20:00", "02:00")).toBe(false);
  });
});

describe("who gets dialled", () => {
  it("needs consent and an open status", () => {
    expect(shouldDial(base, rules, now)).toBe(true);
    expect(shouldDial({ ...base, consentAt: null }, rules, now)).toBe(false);
    for (const status of ["DNC", "LOST", "WON", "APPOINTMENT"]) expect(shouldDial({ ...base, status }, rules, now)).toBe(false);
  });
  it("retries only calls that did not reach the person, after the gap", () => {
    const tried = { ...base, attempts: 1, lastAttemptAt: ago(60), lastOutcome: "NO_ANSWER" };
    expect(shouldDial(tried, rules, now)).toBe(false);
    expect(shouldDial({ ...tried, lastAttemptAt: ago(300) }, rules, now)).toBe(true);
    expect(shouldDial({ ...tried, lastAttemptAt: ago(300), lastOutcome: "COMPLETED" }, rules, now)).toBe(false);
    expect(shouldDial({ ...tried, lastAttemptAt: ago(300), lastOutcome: "NOT_INTERESTED" }, rules, now)).toBe(false);
    expect(shouldDial({ ...tried, attempts: 3, lastAttemptAt: ago(300) }, rules, now)).toBe(false);
  });
  it("calls back at the requested time, even after a conversation", () => {
    const cb = { ...base, attempts: 0, lastAttemptAt: ago(60), lastOutcome: "CALLBACK", nextCallAt: ago(1) };
    expect(shouldDial(cb, rules, now)).toBe(true);
    expect(shouldDial({ ...cb, nextCallAt: new Date(now.getTime() + 60_000) }, rules, now)).toBe(false);
  });
  it("never cold-calls someone who already talked to us", () => {
    // Inbound caller: no consent, a real conversation, no callback.
    expect(shouldDial({ ...base, consentAt: null, lastOutcome: "COMPLETED" }, rules, now)).toBe(false);
    // Even with consent, a finished conversation stops automatic calls.
    expect(shouldDial({ ...base, lastOutcome: "INTERESTED" }, rules, now)).toBe(false);
    // But a callback they asked for is made, consent or not.
    expect(shouldDial({ ...base, consentAt: null, lastOutcome: "CALLBACK", nextCallAt: ago(5) }, rules, now)).toBe(true);
    expect(shouldDial({ ...base, status: "DNC", nextCallAt: ago(5) }, rules, now)).toBe(false);
  });
  it("takes turns across numbers", () => {
    expect(pickNumber(["a", "b", "c"], 0)).toBe("a");
    expect(pickNumber(["a", "b", "c"], 4)).toBe("b");
    expect(pickNumber([], 1)).toBeNull();
  });
});
