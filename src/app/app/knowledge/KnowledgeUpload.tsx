"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CircleCheck, FileUp } from "lucide-react";
import { uploadKnowledge, uploadKnowledgePages, type ActionState } from "../actions";

/** Files the server reads directly; bigger PDFs are read in the browser and only their text is sent. */
const SERVER_LIMIT = 3_500_000;
const MAX_PDF = 200_000_000;

/**
 * Upload a document. Small files go to the server; a large PDF (a 100+ page manual) is read page by page
 * here in the browser, with progress, so there is no upload limit and nothing gets stuck.
 */
export function KnowledgeUpload() {
  const [serverState, runServer, serverPending] = useActionState(uploadKnowledge, undefined);
  const [pagesState, runPages, pagesPending] = useActionState(uploadKnowledgePages, undefined);
  const [, startTransition] = useTransition();
  const [progress, setProgress] = useState("");
  const [localError, setLocalError] = useState("");
  const [reading, setReading] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const state: ActionState = pagesState?.at && (!serverState?.at || pagesState.at > serverState.at) ? pagesState : serverState;
  const busy = serverPending || pagesPending || reading;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError("");
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    const isPdf = file instanceof File && file.size > 0 && /\.pdf$/i.test(file.name);
    if (isPdf && file.size > SERVER_LIMIT) {
      if (file.size > MAX_PDF) return setLocalError("This PDF is larger than 200 MB. Split it into parts.");
      setProgress("Reading the PDF in your browser…");
      setReading(true);
      try {
        const { getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()), { verbosity: 0 });
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          // Keep line breaks: pdf.js marks the end of a line with hasEOL.
          pages.push(content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : "")).join(""));
          if (i % 5 === 0 || i === pdf.numPages) setProgress(`Reading page ${i} of ${pdf.numPages}…`);
        }
        if (!pages.join("").trim()) throw new Error("No selectable text in this PDF (it may be scanned images).");
        const send = new FormData();
        send.set("title", String(fd.get("title") ?? ""));
        send.set("category", String(fd.get("category") ?? "general"));
        send.set("fileName", file.name);
        send.set("pages", JSON.stringify(pages));
        setProgress(`Saving ${pdf.numPages} pages…`);
        startTransition(() => runPages(send));
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : "Could not read this PDF.");
      } finally {
        setReading(false);
      }
      return;
    }
    setProgress(isPdf ? "Reading the PDF on the server…" : "");
    startTransition(() => runServer(fd));
  }

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-2.5">
      <input name="title" required placeholder="Title, e.g. Java course handbook" className="input" />
      <select name="category" className="input" defaultValue="faq">
        <option value="faq">FAQ</option><option value="pricing">Pricing</option><option value="policy">Policy</option><option value="product">Product / course</option><option value="technical">Technical guide</option><option value="general">General</option>
      </select>
      <input type="file" name="file" accept=".pdf,.docx,.txt,.md,.csv,.json" className="input pt-2.5" />
      <p className="text-center text-xs font-bold text-muted">or paste text</p>
      <textarea name="text" rows={7} placeholder={"## What is Java?\nJava is an object-oriented programming language used worldwide for app development.\n\n## Do you offer refunds?\nYes, within 14 days…"} className="input font-mono text-[0.8rem]" />
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="submit" disabled={busy} className="btn"><FileUp size={16} /> {busy ? "Working…" : "Add to knowledge"}</button>
        {busy && progress && <span role="status" className="text-sm font-semibold text-primary">{progress}</span>}
        {!busy && state?.ok && <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><CircleCheck size={16} /> {state.ok}</span>}
        {!busy && (localError || state?.error) && <span role="alert" className="text-sm font-semibold text-rose-700">{localError || state?.error}</span>}
      </div>
    </form>
  );
}
