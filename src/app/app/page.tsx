import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarCheck, PhoneCall, PhoneIncoming, PhoneOutgoing, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { dayKey, duration, formatDateTime, startOfDay, timeAgo, usd } from "@/lib/util";
import { AutoRefresh } from "./_components/AutoRefresh";
import { Avatar, Badge, Card, CardHeader, DIRECTION, Empty, OUTCOME, OutcomeBadge, PageTitle, Stat } from "./_components/ui";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireUser();
  const { denied } = await searchParams;
  const s = await getSettings();
  const now = new Date();
  const today = startOfDay(s.timezone, now);
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);
  const monthStart = new Date(today.getTime() - (Number(new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: s.timezone }).format(now)) - 1) * 86_400_000);
  const real = { isTest: false };

  const [callsToday, answeredToday, inboundToday, apptsUpcoming, openTasks, overdue, week, outcomes, recent, nextAppts, spend] = await Promise.all([
    prisma.call.count({ where: { ...real, startedAt: { gte: today } } }),
    prisma.call.count({ where: { ...real, startedAt: { gte: today }, answeredAt: { not: null } } }),
    prisma.call.count({ where: { ...real, startedAt: { gte: today }, direction: "INBOUND" } }),
    prisma.appointment.count({ where: { status: "BOOKED", startsAt: { gte: now } } }),
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.task.count({ where: { status: { not: "DONE" }, dueAt: { lt: now } } }),
    prisma.call.findMany({ where: { ...real, startedAt: { gte: weekAgo } }, select: { startedAt: true, answeredAt: true } }),
    prisma.call.groupBy({ by: ["outcome"], where: { ...real, startedAt: { gte: weekAgo }, outcome: { not: null } }, _count: true }),
    prisma.call.findMany({ where: real, orderBy: { startedAt: "desc" }, take: 6, include: { contact: { select: { id: true, name: true, phone: true } } } }),
    prisma.appointment.findMany({ where: { status: "BOOKED", startsAt: { gte: now } }, orderBy: { startsAt: "asc" }, take: 5, include: { contact: { select: { id: true, name: true, phone: true } } } }),
    prisma.call.aggregate({ _sum: { costCents: true }, where: { startedAt: { gte: monthStart } } }),
  ]);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekAgo.getTime() + i * 86_400_000 + 12 * 3_600_000);
    const key = dayKey(d, s.timezone);
    const list = week.filter((c) => dayKey(c.startedAt, s.timezone) === key);
    return { key, label: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: s.timezone }).format(d), total: list.length, answered: list.filter((c) => c.answeredAt).length };
  });
  const max = Math.max(1, ...days.map((d) => d.total));
  const totalOutcomes = outcomes.reduce((a, o) => a + o._count, 0);
  const spent = spend._sum.costCents ?? 0;

  return (
    <>
      <AutoRefresh seconds={20} />
      {denied && <p role="alert" className="mb-4 rounded-2xl bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-600/20">That page is only for managers.</p>}
      <PageTitle eyebrow="Overview" title="Dashboard" sub="Live numbers from your AI calling agent. Browser test calls are not counted.">
        <Link href="/app/contacts" className="btn btn-ghost">Contacts</Link>
        <Link href="/app/test-call" className="btn lg:hidden">Test call</Link>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Calls today" value={callsToday} hint={`${inboundToday} inbound · ${callsToday - inboundToday} outbound`} icon={PhoneCall} />
        <Stat label="Answered today" value={answeredToday} hint={callsToday ? `${Math.round((answeredToday / callsToday) * 100)}% pick-up` : "No calls yet"} icon={PhoneIncoming} />
        <Stat label="Upcoming appointments" value={apptsUpcoming} hint="Booked by the agent or team" icon={CalendarCheck} />
        <Stat label="Open follow-ups" value={openTasks} hint={overdue ? `${overdue} overdue` : "None overdue"} icon={AlarmClock} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Last 7 days" sub="Calls placed and answered" icon={PhoneOutgoing}>
            <span className="flex items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-200" /> Calls</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Answered</span>
            </span>
          </CardHeader>
          <div className="flex h-48 items-end gap-2 sm:gap-4" role="img" aria-label="Calls per day for the last 7 days">
            {days.map((d) => (
              <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="relative flex w-full max-w-12 flex-1 items-end">
                  <div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-blue-200/80" style={{ height: `${(d.total / max) * 100}%` }} title={`${d.total} calls`} />
                  <div className="absolute inset-x-1.5 bottom-0 rounded-t-lg bg-gradient-to-t from-blue-700 to-sky-500" style={{ height: `${(d.answered / max) * 100}%` }} title={`${d.answered} answered`} />
                </div>
                <span className="text-[0.7rem] font-bold text-muted">{d.label}</span>
                <span className="digits -mt-1.5 text-xs">{d.total}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Results (7 days)" sub={`${totalOutcomes} finished calls`} icon={Wallet}>
            <Badge tone="blue">{usd(spent)} this month</Badge>
          </CardHeader>
          {totalOutcomes ? (
            <ul className="space-y-2.5">
              {outcomes.sort((a, b) => b._count - a._count).map((o) => {
                const meta = OUTCOME[o.outcome ?? ""] ?? { label: o.outcome ?? "", tone: "grey" };
                const pct = Math.round((o._count / totalOutcomes) * 100);
                return (
                  <li key={o.outcome}>
                    <div className="flex items-center justify-between text-sm"><span className="font-semibold">{meta.label}</span><span className="text-muted">{o._count} · {pct}%</span></div>
                    <div className="mt-1 h-2 rounded-full bg-blue-100/80"><div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-400" style={{ width: `${pct}%` }} /></div>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>No finished calls this week yet.</Empty>}
          <p className="mt-4 text-xs text-muted">Monthly budget {usd(s.monthlyBudgetUsd * 100)}. The dialer pauses when it is reached.</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card flush>
          <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Recent calls" icon={PhoneCall}><Link href="/app/calls" className="text-sm font-bold text-primary">All calls <ArrowRight size={14} className="inline" /></Link></CardHeader></div>
          {recent.length ? (
            <ul className="divide-y divide-blue-100/70">
              {recent.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/calls/${c.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/60 sm:px-6">
                    <Avatar name={c.contact?.name ?? c.contact?.phone} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.contact?.name || c.contact?.phone || c.toNumber || c.fromNumber || "Unknown"}</span>
                      <span className="block truncate text-xs text-muted">{DIRECTION[c.direction]} · {duration(c.durationSec)} · {timeAgo(c.startedAt, now, s.timezone)}</span>
                    </span>
                    <OutcomeBadge outcome={c.outcome} status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : <div className="p-5 sm:p-6"><Empty>No calls yet. Make a test call or add contacts.</Empty></div>}
        </Card>
        <Card flush>
          <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Next appointments" icon={CalendarCheck}><Link href="/app/appointments" className="text-sm font-bold text-primary">All <ArrowRight size={14} className="inline" /></Link></CardHeader></div>
          {nextAppts.length ? (
            <ul className="divide-y divide-blue-100/70">
              {nextAppts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-center text-[0.65rem] font-extrabold uppercase leading-tight text-primary ring-1 ring-blue-200/60">
                    {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: s.timezone }).format(a.startsAt)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{a.contact?.name || a.contact?.phone || "Web visitor"}</span>
                    <span className="block truncate text-xs text-muted">{formatDateTime(a.startsAt, s.timezone)}{a.notes ? ` · ${a.notes}` : ""}</span>
                  </span>
                  {a.contact && <Link href={`/app/contacts/${a.contact.id}`} className="btn btn-ghost btn-sm">Open</Link>}
                </li>
              ))}
            </ul>
          ) : <div className="p-5 sm:p-6"><Empty>No upcoming appointments.</Empty></div>}
        </Card>
      </div>
    </>
  );
}
