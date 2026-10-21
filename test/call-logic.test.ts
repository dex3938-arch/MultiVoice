import { describe, expect, it } from "vitest";
import {
  TOOL_INPUTS, checkWhen, finalOutcome, outcomeFromEndedReason, readReport, strongerOutcome, toolArgs, tzOffsetMinutes, zonedDate,
} from "../src/lib/call-logic";

describe("outcomes", () => {
  it("keeps the stronger result", () => {
    expect(strongerOutcome("INTERESTED", "APPOINTMENT_BOOKED")).toBe("APPOINTMENT_BOOKED");
    expect(strongerOutcome("APPOINTMENT_BOOKED", "INTERESTED")).toBe("APPOINTMENT_BOOKED");
    expect(strongerOutcome(null, "COMPLETED")).toBe("COMPLETED");
    expect(strongerOutcome("APPOINTMENT_BOOKED", "DNC")).toBe("DNC");
  });
  it("a final 'not interested' beats an earlier callback", () => {
    expect(strongerOutcome("CALLBACK", "NOT_INTERESTED")).toBe("NOT_INTERESTED");
    expect(strongerOutcome("APPOINTMENT_BOOKED", "NOT_INTERESTED")).toBe("APPOINTMENT_BOOKED");
  });
  it("maps Vapi endedReason values", () => {
    expect(outcomeFromEndedReason("customer-did-not-answer")).toBe("NO_ANSWER");
    expect(outcomeFromEndedReason("customer-busy")).toBe("BUSY");
    expect(outcomeFromEndedReason("voicemail")).toBe("VOICEMAIL");
    expect(outcomeFromEndedReason("assistant-forwarded-call")).toBe("TRANSFERRED");
    expect(outcomeFromEndedReason("pipeline-error-openai-llm-failed")).toBe("FAILED");
    expect(outcomeFromEndedReason("customer-ended-call")).toBeNull();
    expect(outcomeFromEndedReason(undefined)).toBeNull();
  });
  it("decides the final outcome", () => {
    expect(finalOutcome(null, { endedReason: "customer-ended-call", customerSpoke: true })).toBe("COMPLETED");
    // Picked up but silent: retry later.
    expect(finalOutcome(null, { endedReason: "silence-timed-out", customerSpoke: false })).toBe("NO_ANSWER");
    expect(finalOutcome("APPOINTMENT_BOOKED", { endedReason: "customer-ended-call", customerSpoke: true })).toBe("APPOINTMENT_BOOKED");
    expect(finalOutcome("INTERESTED", { endedReason: "assistant-forwarded-call", customerSpoke: true })).toBe("TRANSFERRED");
    expect(finalOutcome(null, { endedReason: "customer-busy", customerSpoke: false })).toBe("BUSY");
  });
});

describe("end-of-call report", () => {
  it("reads messages, recording, cost and duration", () => {
    const r = readReport({
      type: "end-of-call-report",
      endedReason: "customer-ended-call",
      cost: 0.1234,
      startedAt: "2026-10-20T10:00:00.000Z",
      endedAt: "2026-10-20T10:02:05.000Z",
      analysis: { summary: "Booked a demo." },
      artifact: {
        recording: { mono: { combinedUrl: "https://storage.vapi.ai/rec.wav" } },
        messages: [
          { role: "system", message: "You are…" },
          { role: "bot", message: "Hello!", secondsFromStart: 0.5 },
          { role: "user", message: "Hi, book me in", secondsFromStart: 3 },
          { role: "tool_calls", message: "" },
        ],
      },
    });
    expect(r.messages).toEqual([
      { role: "assistant", text: "Hello!", secondsFromStart: 0.5 },
      { role: "user", text: "Hi, book me in", secondsFromStart: 3 },
    ]);
    expect(r.recordingUrl).toBe("https://storage.vapi.ai/rec.wav");
    expect(r.costCents).toBe(12);
    expect(r.durationSec).toBe(125);
    expect(r.summary).toBe("Booked a demo.");
    expect(r.customerSpoke).toBe(true);
  });
  it("ignores non-https recordings and missing fields", () => {
    const r = readReport({ recordingUrl: "javascript:alert(1)" });
    expect(r.recordingUrl).toBeNull();
    expect(r.messages).toEqual([]);
    expect(r.durationSec).toBeNull();
    expect(r.costCents).toBeNull();
    expect(r.customerSpoke).toBe(false);
  });
});

describe("time zones", () => {
  it("knows IST and New York offsets", () => {
    expect(tzOffsetMinutes("Asia/Kolkata", new Date("2026-10-20T00:00:00Z"))).toBe(330);
    expect(tzOffsetMinutes("America/New_York", new Date("2026-07-01T12:00:00Z"))).toBe(-240);
    expect(tzOffsetMinutes("America/New_York", new Date("2026-12-01T12:00:00Z"))).toBe(-300);
  });
  it("turns a local date + time into the right instant", () => {
    expect(zonedDate("2026-10-21", "17:30", "Asia/Kolkata").toISOString()).toBe("2026-10-21T12:00:00.000Z");
    expect(zonedDate("2026-12-01", "09:00", "America/New_York").toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });
  it("refuses past or far-future bookings", () => {
    const now = new Date("2026-10-20T10:00:00Z");
    expect(checkWhen(new Date("2026-10-20T09:00:00Z"), now)).toMatch(/passed/);
    expect(checkWhen(new Date("2027-06-01T09:00:00Z"), now)).toMatch(/60 days/);
    expect(checkWhen(new Date("2026-10-22T09:00:00Z"), now)).toBeNull();
  });
});

describe("tool inputs", () => {
  it("accepts string or object arguments", () => {
    expect(toolArgs('{"question":"price?"}')).toEqual({ question: "price?" });
    expect(toolArgs({ a: 1 })).toEqual({ a: 1 });
    expect(toolArgs("not json")).toEqual({});
    expect(toolArgs(undefined)).toEqual({});
  });
  it("validates dates and times", () => {
    expect(TOOL_INPUTS.book_appointment.safeParse({ date: "2026-02-30", time: "10:00" }).success).toBe(false);
    expect(TOOL_INPUTS.book_appointment.safeParse({ date: "2026-10-21", time: "25:00" }).success).toBe(false);
    const ok = TOOL_INPUTS.book_appointment.safeParse({ date: "2026-10-21", time: "9:05" });
    expect(ok.success && ok.data.time).toBe("09:05");
    expect(TOOL_INPUTS.save_contact_details.safeParse({ email: "nope" }).success).toBe(false);
    expect(TOOL_INPUTS.record_outcome.safeParse({ outcome: "APPOINTMENT_BOOKED" }).success).toBe(false);
  });
});
