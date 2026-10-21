import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { MANAGERS, TEAM } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { dueIn, formatDateTime } from "@/lib/util";
import { ActionForm } from "../_components/ActionForm";
import { AutoRefresh } from "../_components/AutoRefresh";
import { Badge, Card, Empty, PageTitle } from "../_components/ui";
import { updateTask } from "../actions";

export const metadata: Metadata = { title: "Follow-ups" };

export default async function FollowUpsPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const user = await requireUser();
  const s = await getSettings();
  const showDone = (await searchParams).done === "1";
  const [tasks, team] = await Promise.all([
    prisma.task.findMany({
      where: showDone ? { status: "DONE" } : { status: { not: "DONE" } },
      orderBy: showDone ? { doneAt: "desc" } : { dueAt: "asc" },
      take: 100,
      include: { contact: { select: { id: true, name: true, phone: true } }, assignee: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { active: true, role: { in: [...TEAM] } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const canEdit = TEAM.includes(user.role);
  const tone = { red: "red", amber: "amber", green: "green" } as const;
  return (
    <>
      <AutoRefresh seconds={30} />
      <PageTitle eyebrow="CRM" title="Follow-ups" sub={`Questions the agent could not answer and callbacks callers asked for. The agent promises an answer within ${s.followUpHours} hours.`}>
        <Link href={showDone ? "/app/follow-ups" : "/app/follow-ups?done=1"} className="btn btn-ghost">{showDone ? "Show open" : "Show done"}</Link>
      </PageTitle>
      {tasks.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {tasks.map((t) => {
            const due = dueIn(t.dueAt);
            return (
              <Card key={t.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-extrabold uppercase tracking-wider text-primary">{t.type === "CALLBACK" ? "Callback" : "Follow-up"}</p>
                    <h2 className="mt-0.5 font-bold">{t.title}</h2>
                    {t.contact && <Link href={`/app/contacts/${t.contact.id}`} className="text-sm text-muted hover:underline">{t.contact.name || formatPhone(t.contact.phone)}</Link>}
                  </div>
                  {t.status === "DONE" ? <Badge tone="green">done</Badge> : <Badge tone={tone[due.tone]} dot>{due.text}</Badge>}
                </div>
                {t.details && <p className="soft mt-3 whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm text-ink-2">{t.details}</p>}
                <p className="mt-2 text-xs text-muted">Due {formatDateTime(t.dueAt, s.timezone)}{t.callId ? <> · <Link href={`/app/calls/${t.callId}`} className="underline">open call</Link></> : null}{t.assignee ? ` · ${t.assignee.name}` : ""}</p>
                {canEdit && t.status !== "DONE" && (
                  <ActionForm action={updateTask} submit="Save" className="mt-3">
                    <input type="hidden" name="id" value={t.id} />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select name="status" defaultValue={t.status} className="input"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="DONE">Done</option></select>
                      <select name="assigneeId" defaultValue={t.assigneeId ?? ""} className="input"><option value="">Unassigned</option>{team.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
                    </div>
                    <textarea name="resolution" rows={2} defaultValue={t.resolution ?? ""} placeholder="What was the customer told? (needed to close)" className="input mt-2" />
                    {MANAGERS.includes(user.role) && t.type === "FOLLOW_UP" && (
                      <label className="mt-2 flex items-start gap-2 text-sm"><input type="checkbox" name="addToKnowledge" className="mt-0.5" /> Teach the agent: add this answer to the knowledge base</label>
                    )}
                  </ActionForm>
                )}
                {t.status === "DONE" && t.resolution && <p className="mt-3 text-sm"><b>Told:</b> {t.resolution}</p>}
              </Card>
            );
          })}
        </div>
      ) : <Empty>{showDone ? "Nothing closed yet." : "All caught up. No open follow-ups."}</Empty>}
    </>
  );
}
