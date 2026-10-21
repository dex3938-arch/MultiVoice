"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneCall, PhoneOff } from "lucide-react";
import type Vapi from "@vapi-ai/web";
import { cn } from "@/lib/util";

type Line = { role: "assistant" | "user"; text: string; final: boolean };

/**
 * Talk to the assistant from the browser (a Vapi web call, no phone number used). Saved as a test call:
 * transcript, tools and summary appear under Calls → Browser tests.
 */
export function TestCall({ publicKey, assistantId, variables }: { publicKey: string; assistantId: string; variables: Record<string, string> }) {
  const vapi = useRef<Vapi | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "live" | "ended">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  const box = useRef<HTMLOListElement>(null);

  useEffect(() => () => void vapi.current?.stop(), []);
  useEffect(() => {
    if (state !== "live") return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);
  useEffect(() => box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" }), [lines]);

  async function start() {
    setError("");
    setLines([]);
    setSeconds(0);
    setState("connecting");
    try {
      if (!vapi.current) {
        // Loaded only when needed, so the rest of the portal stays light.
        const { default: VapiClient } = await import("@vapi-ai/web");
        const v = new VapiClient(publicKey, undefined, { avoidEval: true });
        v.on("call-start", () => setState("live"));
        v.on("call-end", () => { setState("ended"); setSpeaking(false); setLevel(0); });
        v.on("speech-start", () => setSpeaking(true));
        v.on("speech-end", () => setSpeaking(false));
        v.on("volume-level", (l: number) => setLevel(l));
        v.on("error", (e: unknown) => {
          const msg = (e as { error?: { message?: string }; message?: string })?.error?.message ?? (e as { message?: string })?.message;
          setError(typeof msg === "string" ? msg : "The call failed. Check the public key, assistant id and microphone permission.");
          setState("ended");
        });
        v.on("message", (m: { type?: string; role?: string; transcript?: string; transcriptType?: string }) => {
          if (m.type !== "transcript" || !m.transcript || (m.role !== "assistant" && m.role !== "user")) return;
          const line: Line = { role: m.role, text: m.transcript, final: m.transcriptType === "final" };
          setLines((prev) => {
            const last = prev[prev.length - 1];
            // Partial transcripts replace the line being spoken; a final one closes it.
            if (last && !last.final && last.role === line.role) return [...prev.slice(0, -1), line];
            return [...prev, line];
          });
        });
        vapi.current = v;
      }
      await vapi.current.start(assistantId, { variableValues: variables });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the call.");
      setState("idle");
    }
  }

  const live = state === "live";
  const mm = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="glass-blue relative overflow-hidden rounded-3xl p-6 text-center">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <p className="eyebrow text-white/75">{variables.agentName} · {variables.businessName}</p>
        <div className="relative mx-auto mt-6 grid h-40 w-40 place-items-center">
          <span className="absolute inset-0 rounded-full bg-white/15 transition-transform duration-150" style={{ transform: `scale(${1 + (live ? Math.min(level, 1) * 0.35 : 0)})` }} />
          <span className={cn("absolute inset-3 rounded-full bg-white/20", speaking && "animate-ping")} />
          <span className="relative grid h-24 w-24 place-items-center rounded-full bg-white text-primary shadow-xl"><PhoneCall size={34} /></span>
        </div>
        <p className="mt-5 text-lg font-extrabold">{state === "idle" ? "Ready" : state === "connecting" ? "Connecting…" : live ? (speaking ? "Agent speaking" : "Listening…") : "Call ended"}</p>
        <p className="digits mt-1 text-white/85">{live || state === "ended" ? mm : "—"}</p>
        <div className="mt-6 flex justify-center gap-3">
          {live || state === "connecting" ? (
            <>
              <button type="button" onClick={() => { const m = !muted; vapi.current?.setMuted(m); setMuted(m); }} className="btn btn-white h-12 w-12 rounded-full p-0" aria-label={muted ? "Unmute" : "Mute"} disabled={!live}>
                {muted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button type="button" onClick={() => void vapi.current?.stop()} className="btn btn-danger h-12 rounded-full px-6"><PhoneOff size={18} /> End</button>
            </>
          ) : (
            <button type="button" onClick={start} className="btn btn-white h-12 rounded-full px-7"><Mic size={18} /> {state === "ended" ? "Call again" : "Start talking"}</button>
          )}
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-white/95 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
      </div>
      <div className="glass flex min-h-[420px] flex-col rounded-3xl">
        <p className="border-b border-blue-100/70 px-5 py-3.5 text-sm font-bold">Live transcript</p>
        <ol ref={box} className="scroll-thin flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
          {lines.map((l, i) => (
            <li key={i} className={cn("flex", l.role === "user" ? "justify-end" : "justify-start")}>
              <span className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm", l.role === "user" ? "rounded-br-md bg-gradient-to-br from-blue-600 to-sky-500 text-white" : "rounded-bl-md bg-white/90 ring-1 ring-blue-100", !l.final && "opacity-70")}>{l.text}</span>
            </li>
          ))}
          {!lines.length && <li className="grid h-full place-items-center text-center text-sm text-muted">Press “Start talking”, allow the microphone, and speak as a customer would.</li>}
        </ol>
      </div>
    </div>
  );
}
