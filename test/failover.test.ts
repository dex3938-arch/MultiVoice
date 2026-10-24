import { describe, expect, it } from "vitest";
import { classifyFailure, endedForCredits, isOurSide, parseOrder, usableProviders } from "../src/lib/providers/failover";
import { outcomeFromDisposition, parseTranscript, readDograhPayload } from "../src/lib/call-logic";
import { twilioSignature, twilioValid } from "../src/lib/twilio";

const now = new Date("2026-10-23T10:00:00Z");
const later = new Date(now.getTime() + 60_000);
const earlier = new Date(now.getTime() - 60_000);

describe("provider failover", () => {
  it("knows why a provider failed", () => {
    expect(classifyFailure(402)).toBe("credits");
    expect(classifyFailure(400, "Insufficient credits to make this call")).toBe("credits");
    expect(classifyFailure(403, "Your wallet balance is low")).toBe("credits");
    expect(classifyFailure(401, "Invalid key")).toBe("auth");
    expect(classifyFailure(429)).toBe("rate");
    expect(classifyFailure(0, "fetch failed")).toBe("down");
    expect(classifyFailure(503)).toBe("down");
    expect(classifyFailure(400, "customer.number must be a valid phone number")).toBe("request");
    expect(isOurSide("credits")).toBe(true);
    expect(isOurSide("request")).toBe(false);
  });
  it("uses providers in order, skipping resting or unconfigured ones", () => {
    const order = parseOrder("vapi,dograh");
    const ok = { configured: true, restingUntil: null };
    expect(usableProviders(order, { vapi: ok, dograh: ok }, now)).toEqual(["vapi", "dograh"]);
    // Vapi out of credits → Dograh takes over.
    expect(usableProviders(order, { vapi: { configured: true, restingUntil: later }, dograh: ok }, now)).toEqual(["dograh"]);
    // Rest is over → Vapi is first again.
    expect(usableProviders(order, { vapi: { configured: true, restingUntil: earlier }, dograh: ok }, now)).toEqual(["vapi", "dograh"]);
    expect(usableProviders(order, { vapi: ok, dograh: { configured: false, restingUntil: null } }, now)).toEqual(["vapi"]);
    expect(usableProviders(parseOrder("dograh,vapi"), { vapi: ok, dograh: ok }, now)).toEqual(["dograh", "vapi"]);
    expect(parseOrder("junk")).toEqual(["vapi", "dograh"]);
    expect(parseOrder("dograh,dograh")).toEqual(["dograh"]);
  });
  it("spots calls that ended because of billing", () => {
    expect(endedForCredits("call.start.error-insufficient-credits")).toBe(true);
    expect(endedForCredits("customer-ended-call")).toBe(false);
  });
});

describe("Dograh payloads", () => {
  it("reads the webhook template and ignores unfilled values", () => {
    const ev = readDograhPayload({
      event: "call_ended", run_id: "1234", direction: "outbound", phone: "+919876543210",
      disposition: "NOT_INTERESTED", summary: "Said no thanks.", duration: "84", recording_url: "https://api.dograh.com/rec/1.wav",
      transcript_url: "{{transcript_url}}", cost_usd: "None",
    });
    expect(ev.runId).toBe("1234");
    expect(ev.direction).toBe("OUTBOUND");
    expect(ev.transcriptUrl).toBeNull();
    expect(ev.report.costCents).toBeNull();
    expect(ev.report.durationSec).toBe(84);
    expect(ev.report.outcomeHint).toBe("NOT_INTERESTED");
    expect(ev.report.customerSpoke).toBe(true);
    expect(readDograhPayload({ run_id: "x; drop" }).runId).toBeNull();
  });
  it("maps dispositions", () => {
    expect(outcomeFromDisposition("appointment_booked")).toBe("APPOINTMENT_BOOKED");
    expect(outcomeFromDisposition("Callback requested")).toBe("CALLBACK");
    expect(outcomeFromDisposition("no_answer")).toBe("NO_ANSWER");
    expect(outcomeFromDisposition("interested")).toBe("INTERESTED");
    expect(outcomeFromDisposition("do_not_call")).toBe("DNC");
    expect(outcomeFromDisposition(null)).toBeNull();
  });
  it("parses JSON and text transcripts", () => {
    expect(parseTranscript(JSON.stringify([{ role: "assistant", content: "Hi" }, { role: "user", content: "What is Java?" }]))).toEqual([
      { role: "assistant", text: "Hi" }, { role: "user", text: "What is Java?" },
    ]);
    expect(parseTranscript("Agent: Hello\nUser: Price?\nnoise line")).toEqual([{ role: "assistant", text: "Hello" }, { role: "user", text: "Price?" }]);
  });
});

describe("Twilio signature", () => {
  it("matches Twilio's documented example", () => {
    const params = { CallSid: "CA1234567890ABCDE", Caller: "+14158675310", Digits: "1234", From: "+14158675310", To: "+18005551212" };
    expect(twilioSignature("12345", "https://mycompany.com/myapp.php?foo=1&bar=2", params)).toBe("GvWf1cFY/Q7PnoempGyD5oXAezc=");
  });
  it("accepts Twilio-signed requests only", () => {
    const url = "https://app.example.com/api/twilio/voice";
    const params = { CallSid: "CA123", From: "+14155550100", To: "+14155550199" };
    const sig = twilioSignature("token-abc", url, params);
    expect(twilioValid("token-abc", sig, url, params)).toBe(true);
    expect(twilioValid("token-abc", sig, url, { ...params, To: "+10000000000" })).toBe(false);
    expect(twilioValid("other", sig, url, params)).toBe(false);
    expect(twilioValid(undefined, sig, url, params)).toBe(false);
  });
});
