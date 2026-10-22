import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AudioLines, FileText, MessageSquareText } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { cn, duration, formatDateTime, usd } from "@/lib/util";
import { AutoRefresh } from "../../_components/AutoRefresh";
import { Badge, Card, CardHeader, DIRECTION, Empty, OutcomeBadge } from "../../_components/ui";

export const metadata: Metadata = { title: "Call" };

export default async function CallPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const s = await getSettings();
  const call = await prisma.call.findUnique({
    where: { id },
    include: { contact: true, messages: { orderBy: { seq: "asc" } }, tasks: true, appointments: true },
  });
  if (!call) notFound();
  const live = !call.endedAt;
  const facts: [string, React.ReactNode][] = [
    ["Type", DIRECTION[call.direction]],
    ["Started", formatDateTime(call.startedAt, s.timezone)],
    ["Length", duration(call.durationSec)],
    ["From", call.fromNumber ? formatPhone(call.fromNumber) : "—"],
    ["To", call.toNumber ? formatPhone(call.toNumber) : "—"],
    ["Ended because", call.endedReason ?? (live ? "still live" : "—")],
    ["Cost", call.costCents != null ? usd(call.costCents) : "—"],
  ];
  return (
    <>
      {live && <AutoRefresh seconds={5} />}
      <Link href="/app/calls" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary"><ArrowLeft size={16} /> Calls</Link>
      <div className="glass mb-5 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">
            {call.contact ? <Link href={`/app/contacts/${call.contact.id}`} className="hover:underline">{call.contact.name || formatPhone(call.contact.phone)}</Link> : "Browser test call"}
          </h1>
          <p className="text-sm text-muted">{DIRECTION[call.direction]} call · {formatDateTime(call.startedAt, s.timezone)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OutcomeBadge outcome={call.outcome} status={call.status} />
          {call.isTest && <Badge>test</Badge>}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader title="Transcript" sub={live ? "Appears when the call ends" : `${call.messages.length} turns`} icon={MessageSquareText} />
          {call.messages.length ? (
            <ol className="space-y-3">
              {call.messages.filter((m) => m.role !== "tool").map((m) => (
                <li key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "rounded-br-md bg-gradient-to-br from-blue-600 to-sky-500 text-white" : "rounded-bl-md bg-white/85 text-ink ring-1 ring-blue-100")}>
                    <p className={cn("mb-0.5 text-[0.65rem] font-extrabold uppercase tracking-wider", m.role === "user" ? "text-white/70" : "text-primary")}>{m.role === "user" ? "Caller" : "Agent"}</p>
                    {m.text}
                  </div>
                </li>
              ))}
            </ol>
          ) : <Empty>{live ? "The call is in progress…" : "No transcript for this call."}</Empty>}
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Summary" icon={FileText} />
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{call.summary || "No summary."}</p>
            {(call.appointments.length > 0 || call.tasks.length > 0) && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {call.appointments.map((a) => <li key={a.id} className="soft rounded-xl px-3 py-2">📅 Appointment {formatDateTime(a.startsAt, s.timezone)}</li>)}
                {call.tasks.map((t) => <li key={t.id} className="soft rounded-xl px-3 py-2">{t.type === "CALLBACK" ? "📞" : "📝"} {t.title}</li>)}
              </ul>
            )}
          </Card>
          {(call.recordingUrl || call.vapiCallId) && (
            <Card>
              <CardHeader title="Recording" icon={AudioLines} />
              <audio controls preload="none" src={`/api/calls/${call.id}/recording`} className="w-full" />
            </Card>
          )}
          <Card>
            <dl className="divide-y divide-blue-100/70 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
