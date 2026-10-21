import type { Metadata } from "next";
import { BookOpen, FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { MANAGERS } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/util";
import { ActionForm } from "../_components/ActionForm";
import { Badge, Card, CardHeader, Empty, PageTitle } from "../_components/ui";
import { setDocumentStatus, uploadKnowledge } from "../actions";

export const metadata: Metadata = { title: "Knowledge" };

export default async function KnowledgePage() {
  const user = await requireUser();
  const s = await getSettings();
  const docs = await prisma.knowledgeDocument.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { _count: { select: { chunks: true } }, uploadedBy: { select: { name: true } } } });
  const canManage = MANAGERS.includes(user.role);
  return (
    <>
      <PageTitle eyebrow="Agent" title="Knowledge base" sub="The agent answers questions only from these documents (tool: search_knowledge). Anything not here becomes a follow-up for your team." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card flush className="overflow-hidden">
          <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Documents" sub={`${docs.filter((d) => d.status === "ACTIVE").length} active`} icon={BookOpen} /></div>
          {docs.length ? (
            <ul className="divide-y divide-blue-100/70">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{d.title}</span>
                    <span className="block truncate text-xs text-muted">{d.category} · {d._count.chunks} passages · {formatDate(d.createdAt, s.timezone)}{d.uploadedBy ? ` · ${d.uploadedBy.name}` : ""}{d.fileName ? ` · ${d.fileName}` : ""}</span>
                  </span>
                  {d.status === "ACTIVE" ? <Badge tone="green" dot>active</Badge> : <Badge>archived</Badge>}
                  {canManage && (
                    <form action={setDocumentStatus}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="status" value={d.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"} />
                      <button className="btn btn-ghost btn-sm">{d.status === "ACTIVE" ? "Archive" : "Restore"}</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : <div className="p-5 sm:p-6"><Empty>No documents yet. Add your FAQ, prices, policies and opening hours.</Empty></div>}
        </Card>
        {canManage && (
          <Card>
            <CardHeader title="Add knowledge" sub="PDF, Word, TXT, Markdown, CSV or JSON · max 4 MB" icon={FilePlus2} />
            <ActionForm action={uploadKnowledge} submit="Add to knowledge" pendingText="Reading…" resetOnOk>
              <div className="space-y-2.5">
                <input name="title" required placeholder="Title, e.g. Pricing FAQ 2026" className="input" />
                <select name="category" className="input" defaultValue="faq">
                  <option value="faq">FAQ</option><option value="pricing">Pricing</option><option value="policy">Policy</option><option value="product">Product</option><option value="general">General</option>
                </select>
                <input type="file" name="file" accept=".pdf,.docx,.txt,.md,.csv,.json" className="input pt-2.5" />
                <p className="text-center text-xs font-bold text-muted">or paste text</p>
                <textarea name="text" rows={7} placeholder={"## What are your opening hours?\nMonday to Saturday, 9 am to 7 pm.\n\n## Do you offer refunds?\nYes, within 14 days…"} className="input font-mono text-[0.8rem]" />
              </div>
            </ActionForm>
            <p className="mt-4 text-xs leading-relaxed text-muted">Best format: one question per heading (<code>## question</code>) with a short answer under it. See docs/FAQ-FORMAT.md.</p>
          </Card>
        )}
      </div>
    </>
  );
}
