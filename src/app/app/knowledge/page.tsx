import type { Metadata } from "next";
import { BookOpen, FilePlus2 } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { MANAGERS } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/util";
import { Badge, Card, CardHeader, Empty, PageTitle } from "../_components/ui";
import { deleteDocument, setDocumentStatus } from "../actions";
import { KnowledgeTest } from "./KnowledgeTest";
import { KnowledgeUpload } from "./KnowledgeUpload";

export const metadata: Metadata = { title: "Knowledge" };
// Reading a long PDF on the server can take a while.
export const maxDuration = 60;

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
                    <span className="block truncate text-xs text-muted">{d.category} · {d.pages ? `${d.pages} pages · ` : ""}{d._count.chunks} passages · {formatDate(d.createdAt, s.timezone)}{d.uploadedBy ? ` · ${d.uploadedBy.name}` : ""}{d.fileName ? ` · ${d.fileName}` : ""}</span>
                  </span>
                  {d.status === "ACTIVE" ? <Badge tone="green" dot>active</Badge> : <Badge>archived</Badge>}
                  {canManage && (
                    <form action={setDocumentStatus}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="status" value={d.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"} />
                      <button className="btn btn-ghost btn-sm">{d.status === "ACTIVE" ? "Archive" : "Restore"}</button>
                    </form>
                  )}
                  {canManage && d.status === "ARCHIVED" && (
                    <form action={deleteDocument}>
                      <input type="hidden" name="id" value={d.id} />
                      <button className="btn btn-ghost btn-sm text-rose-700">Delete</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : <div className="p-5 sm:p-6"><Empty>No documents yet. Add your FAQ, prices, policies and opening hours.</Empty></div>}
        </Card>
        <div className="space-y-5">
        <KnowledgeTest />
        {canManage && (
          <Card>
            <CardHeader title="Add knowledge" sub="PDF (any length), Word, TXT, Markdown, CSV or JSON" icon={FilePlus2} />
            <KnowledgeUpload />
            <p className="mt-4 text-xs leading-relaxed text-muted">Best format: one question per heading (<code>## question</code>) with a short answer under it. See docs/FAQ-FORMAT.md.</p>
          </Card>
        )}
        </div>
      </div>
    </>
  );
}
