"use client";

import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { testKnowledge, type KnowledgeTestResult } from "../actions";
import { Card, CardHeader } from "../_components/ui";

/** Ask a question and see exactly what the agent receives from search_knowledge, and how fast. */
export function KnowledgeTest() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<KnowledgeTestResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader title="Ask the knowledge base" sub="What the agent gets for a caller's question" icon={Search} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 2) start(async () => setRes(await testKnowledge(q)));
        }}
        className="flex gap-2"
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={300} placeholder="e.g. What is Java?" className="input" />
        <button type="submit" disabled={pending} className="btn shrink-0">{pending ? "…" : "Ask"}</button>
      </form>
      {res && (
        <div className="mt-4 space-y-2 text-sm" aria-live="polite">
          <p className="text-xs font-semibold text-muted">{res.found ? `Found in ${res.ms} ms` : `Not found (${res.ms} ms): the agent says the team will confirm and creates a follow-up`}</p>
          {res.passages.map((p, i) => (
            <div key={i} className="soft rounded-2xl px-4 py-3">
              <p className="flex items-center justify-between gap-2 text-xs font-bold text-primary"><span className="truncate">{p.question ?? p.title}</span><span className="shrink-0 text-muted">{Math.round(p.confidence * 100)}% match</span></p>
              <p className="mt-1 leading-relaxed text-ink-2">{p.text}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
