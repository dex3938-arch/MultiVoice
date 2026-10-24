/**
 * Pure call logic (no database): reading Vapi reports, deciding outcomes, time-zone maths, tool inputs.
 * Unit-tested in test/call-logic.test.ts.
 */
import { z } from "zod";

export type OutcomeValue =
  | "APPOINTMENT_BOOKED" | "CALLBACK" | "INTERESTED" | "NOT_INTERESTED" | "FOLLOW_UP" | "TRANSFERRED"
  | "DNC" | "COMPLETED" | "NO_ANSWER" | "BUSY" | "VOICEMAIL" | "FAILED";

/** When two things happen on one call, the stronger result is kept (e.g. a booking beats "interested"). */
const RANK: Record<OutcomeValue, number> = {
  DNC: 10, APPOINTMENT_BOOKED: 9, TRANSFERRED: 8, CALLBACK: 7, FOLLOW_UP: 6, INTERESTED: 5, NOT_INTERESTED: 4,
  COMPLETED: 3, VOICEMAIL: 2, BUSY: 1, NO_ANSWER: 1, FAILED: 0,
};

export function strongerOutcome(current: OutcomeValue | null | undefined, next: OutcomeValue): OutcomeValue {
  // A final "not interested" at the end beats an earlier callback / follow-up / interest.
  if (next === "NOT_INTERESTED" && current && ["CALLBACK", "FOLLOW_UP", "INTERESTED", "COMPLETED"].includes(current)) return next;
  if (!current) return next;
  return RANK[next] > RANK[current] ? next : current;
}

/** Vapi's endedReason → outcome, for calls where no tool set one. */
export function outcomeFromEndedReason(reason: string | undefined | null): OutcomeValue | null {
  const r = (reason ?? "").toLowerCase();
  if (!r) return null;
  if (r.includes("did-not-answer") || r.includes("no-answer")) return "NO_ANSWER";
  if (r.includes("busy")) return "BUSY";
  if (r.includes("voicemail")) return "VOICEMAIL";
  if (r.includes("forwarded") || r.includes("transfer")) return "TRANSFERRED";
  if (r.includes("error") || r.includes("failed") || r.includes("fault") || r.includes("invalid")) return "FAILED";
  return null;
}

export type ReportMessage = { role: "assistant" | "user" | "system" | "tool"; text: string; secondsFromStart?: number };

/** Read an end-of-call-report defensively (Vapi has moved fields between versions). */
export function readReport(message: Record<string, unknown>): CallReport {
  const m = message as {
    endedReason?: string; summary?: string; recordingUrl?: string; transcript?: string; cost?: number;
    startedAt?: string; endedAt?: string; durationSeconds?: number;
    analysis?: { summary?: string; successEvaluation?: unknown };
    artifact?: { transcript?: string; recordingUrl?: string; recording?: { mono?: { combinedUrl?: string }; stereoUrl?: string; url?: string }; messages?: unknown[] };
    messages?: unknown[];
    call?: { startedAt?: string; endedAt?: string; cost?: number };
  };
  const raw = (m.artifact?.messages ?? m.messages ?? []) as { role?: string; message?: string; content?: string; secondsFromStart?: number }[];
  const messages: ReportMessage[] = [];
  for (const x of raw) {
    const role = x.role === "bot" ? "assistant" : x.role;
    const text = String(x.message ?? x.content ?? "").trim();
    if (!text || !role || !["assistant", "user", "system", "tool"].includes(role)) continue;
    if (role === "system") continue; // the system prompt is not part of the conversation
    messages.push({ role: role as ReportMessage["role"], text: text.slice(0, 4000), secondsFromStart: x.secondsFromStart });
  }
  const startedAt = parseDate(m.startedAt ?? m.call?.startedAt);
  const endedAt = parseDate(m.endedAt ?? m.call?.endedAt);
  const durationSec =
    typeof m.durationSeconds === "number" ? Math.round(m.durationSeconds) : startedAt && endedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)) : null;
  const recordingUrl = [m.artifact?.recordingUrl, m.recordingUrl, m.artifact?.recording?.mono?.combinedUrl, m.artifact?.recording?.stereoUrl, m.artifact?.recording?.url].find(
    (u): u is string => typeof u === "string" && /^https:\/\//.test(u),
  );
  const cost = typeof m.cost === "number" ? m.cost : typeof m.call?.cost === "number" ? m.call.cost : null;
  return {
    endedReason: m.endedReason ?? null,
    summary: (m.analysis?.summary ?? m.summary ?? "").toString().trim().slice(0, 4000) || null,
    recordingUrl: recordingUrl ?? null,
    costCents: cost === null ? null : Math.round(cost * 100),
    startedAt,
    endedAt,
    durationSec,
    messages,
    customerSpoke: messages.some((x) => x.role === "user" && x.text.length > 1),
  };
}

export type CallReport = {
  endedReason: string | null;
  summary: string | null;
  recordingUrl: string | null;
  costCents: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  durationSec: number | null;
  messages: ReportMessage[];
  customerSpoke: boolean;
  /** A result the provider already worked out (Dograh disposition). */
  outcomeHint?: OutcomeValue | null;
};

const parseDate = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Final outcome for a finished call. */
export function finalOutcome(current: OutcomeValue | null, report: { endedReason: string | null; customerSpoke: boolean }): OutcomeValue {
  const fromReason = outcomeFromEndedReason(report.endedReason);
  if (current) return fromReason === "TRANSFERRED" ? strongerOutcome(current, "TRANSFERRED") : current;
  if (fromReason) return fromReason;
  // Picked up but never said a word: treated as not reached, so the dialer tries again.
  return report.customerSpoke ? "COMPLETED" : "NO_ANSWER";
}

// ---------------------------------------------------------------- time zones

/** Offset of `timeZone` from UTC at `at`, in minutes (IST = +330). */
export function tzOffsetMinutes(timeZone: string, at: Date) {
  const asZone = new Date(at.toLocaleString("en-US", { timeZone }));
  const asUtc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  return Math.round((asZone.getTime() - asUtc.getTime()) / 60_000);
}

/** "2026-10-21" + "17:30" in the business time zone → a Date. */
export function zonedDate(dateISO: string, time: string, timeZone: string): Date {
  const guess = new Date(`${dateISO}T${time}:00Z`);
  return new Date(guess.getTime() - tzOffsetMinutes(timeZone, guess) * 60_000);
}

export const todayIn = (timeZone: string, now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);

export function labelFor(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone }).format(d);
}

// ---------------------------------------------------------------- tool inputs (what the assistant may send)

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, "not a real date");
const time = z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).transform((t) => t.padStart(5, "0"));

export const TOOL_INPUTS = {
  search_knowledge: z.object({ question: z.string().trim().min(2).max(300) }),
  save_contact_details: z.object({
    name: z.string().trim().max(120).optional(),
    email: z.string().trim().email().max(160).optional(),
    company: z.string().trim().max(120).optional(),
    city: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
  book_appointment: z.object({ date, time, notes: z.string().trim().max(500).optional() }),
  schedule_callback: z.object({ date, time: time.optional() }),
  create_follow_up: z.object({ reason: z.string().trim().min(2).max(120), details: z.string().trim().max(1000).optional() }),
  mark_do_not_call: z.object({}).passthrough(),
  record_outcome: z.object({ outcome: z.enum(["INTERESTED", "NOT_INTERESTED", "COMPLETED"]) }),
} as const;
export type ToolName = keyof typeof TOOL_INPUTS;

/** Vapi sends arguments as an object (or, in some versions, a JSON string). */
export function toolArgs(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return raw ?? {};
}

/** Check a requested booking time: in the future, within `maxDays`. Returns an error to read back, or null. */
export function checkWhen(when: Date, now: Date, maxDays = 60): string | null {
  if (when.getTime() < now.getTime() + 15 * 60_000) return "That time has already passed or is too soon. Ask the caller for a later time.";
  if (when.getTime() > now.getTime() + maxDays * 86_400_000) return `Only the next ${maxDays} days can be booked. Ask for a nearer date.`;
  return null;
}

// ---------------------------------------------------------------- Dograh (webhook node payload, see dograh/webhook-template.json)

/** Template values Dograh could not fill come through as "", "None", "null" or "{{…}}". */
export function clean(v: unknown, max = 4000): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || /^(none|null|undefined|nan)$/i.test(s) || /^\{\{.*\}\}$/.test(s)) return null;
  return s.slice(0, max);
}

/** Dograh call disposition → our outcome (only the ones that are clear). */
export function outcomeFromDisposition(d: string | null): OutcomeValue | null {
  const x = (d ?? "").toLowerCase().replace(/[\s_]+/g, "-");
  if (!x) return null;
  if (/do-?not-?call|dnc|unsubscribe/.test(x)) return "DNC";
  if (/not-?interested|declined|rejected/.test(x)) return "NOT_INTERESTED";
  if (/appointment|booked|meeting|demo-scheduled/.test(x)) return "APPOINTMENT_BOOKED";
  if (/call-?back|callback|reschedule/.test(x)) return "CALLBACK";
  if (/transfer/.test(x)) return "TRANSFERRED";
  if (/interested|qualified|hot|warm/.test(x)) return "INTERESTED";
  return outcomeFromEndedReason(x);
}

/** Transcript from Dograh: JSON list of turns, or "User: … / Agent: …" lines. */
export function parseTranscript(raw: string): ReportMessage[] {
  const out: ReportMessage[] = [];
  const role = (r: string): ReportMessage["role"] | null =>
    /^(user|customer|caller|human)$/i.test(r) ? "user" : /^(assistant|agent|bot|ai)$/i.test(r) ? "assistant" : null;
  try {
    const j = JSON.parse(raw) as unknown;
    const list = Array.isArray(j) ? j : Array.isArray((j as { messages?: unknown[] })?.messages) ? (j as { messages: unknown[] }).messages : Array.isArray((j as { transcript?: unknown[] })?.transcript) ? (j as { transcript: unknown[] }).transcript : null;
    if (list) {
      for (const t of list as { role?: string; speaker?: string; content?: string; text?: string; message?: string; timestamp?: number }[]) {
        const r = role(String(t.role ?? t.speaker ?? ""));
        const text = String(t.content ?? t.text ?? t.message ?? "").trim();
        if (r && text) out.push({ role: r, text: text.slice(0, 4000) });
      }
      return out;
    }
  } catch {
    /* plain text */
  }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*\[?[\d:.\s-]*\]?\s*(user|customer|caller|assistant|agent|bot|ai)\s*[:\-]\s*(.+)$/i);
    const r = m && role(m[1]);
    if (r && m) out.push({ role: r, text: m[2].trim().slice(0, 4000) });
  }
  return out;
}

export type DograhEvent = {
  runId: string | null;
  direction: "INBOUND" | "OUTBOUND" | null;
  phone: string | null;
  transcriptUrl: string | null;
  report: CallReport;
};

export function readDograhPayload(body: Record<string, unknown>): DograhEvent {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = clean(body[k]);
      if (v) return v;
    }
    return null;
  };
  const runId = get("run_id", "workflow_run_id");
  const dir = (get("direction") ?? "").toLowerCase();
  const disposition = get("disposition", "call_disposition", "mapped_disposition", "call_status");
  const duration = Number(get("duration", "call_duration_seconds"));
  const ended = parseDate(get("ended_at"));
  const started = parseDate(get("call_time", "started_at")) ?? (ended && Number.isFinite(duration) ? new Date(ended.getTime() - duration * 1000) : null);
  const transcriptText = get("transcript");
  const messages = transcriptText ? parseTranscript(transcriptText) : [];
  const recording = get("recording_url", "recording");
  const cost = Number(get("cost_usd", "cost"));
  const hint = outcomeFromDisposition(disposition);
  const spoke = messages.some((m) => m.role === "user") || (Number.isFinite(duration) && duration >= 15 && hint !== "NO_ANSWER" && hint !== "BUSY" && hint !== "VOICEMAIL");
  return {
    runId: runId && /^[\w-]{1,60}$/.test(runId) ? runId : null,
    direction: dir.startsWith("in") ? "INBOUND" : dir.startsWith("out") ? "OUTBOUND" : null,
    phone: get("phone", "phone_number", "caller_number", "customer_number"),
    transcriptUrl: get("transcript_url"),
    report: {
      endedReason: disposition ? `dograh:${disposition.slice(0, 70)}` : null,
      summary: get("summary", "outcome"),
      recordingUrl: recording && /^https:\/\//.test(recording) ? recording.slice(0, 600) : null,
      costCents: Number.isFinite(cost) && cost > 0 ? Math.round(cost * 100) : null,
      startedAt: started,
      endedAt: ended,
      durationSec: Number.isFinite(duration) && duration >= 0 ? Math.round(duration) : null,
      messages,
      customerSpoke: spoke,
      outcomeHint: hint,
    },
  };
}
