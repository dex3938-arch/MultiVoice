"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Radio } from "lucide-react";
import { dialerPulse } from "../actions";

/**
 * Live dialing without a paid cron: while this page is open and the switch is on, the dialer runs every
 * 25 seconds. (Vercel Cron or any external scheduler does the same thing in the background.)
 */
export function LiveDialer() {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [note, setNote] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    if (!on) return;
    const run = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      try {
        const r = await dialerPulse();
        setNote(r.ready ? (r.placed ? `Placed ${r.placed} call${r.placed === 1 ? "" : "s"} at ${new Date().toLocaleTimeString()}` : `Checked at ${new Date().toLocaleTimeString()}, nobody due`) : r.reasons.join(" "));
        router.refresh();
      } catch {
        setNote("Could not reach the server, retrying.");
      } finally {
        busy.current = false;
      }
    };
    void run();
    const id = window.setInterval(run, 25_000);
    return () => window.clearInterval(id);
  }, [on, router]);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setOn((v) => !v)} className={on ? "btn btn-danger" : "btn"} aria-pressed={on}>
        {on ? <><Pause size={16} /> Stop live dialing</> : <><Play size={16} /> Start live dialing</>}
      </button>
      {on && <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Radio size={16} className="animate-pulse" /> Live, keep this tab open</span>}
      {note && <span className="w-full text-xs text-muted">{note}</span>}
    </div>
  );
}
