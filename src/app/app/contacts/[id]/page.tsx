import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, NotebookPen, Phone, PhoneCall } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { MANAGERS, TEAM } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { duration, formatDateTime } from "@/lib/util";
import { ActionForm } from "../../_components/ActionForm";
import { Avatar, Badge, CONTACT_STATUS, Card, CardHeader, DIRECTION, Empty, OutcomeBadge, StatusBadge } from "../../_components/ui";
import { callNow, deleteContact, updateContact } from "../../actions";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const s = await getSettings();
  const c = await prisma.contact.findUnique({
    where: { id },
    include: {
      calls: { orderBy: { startedAt: "desc" }, take: 30 },
      tasks: { orderBy: { dueAt: "asc" }, take: 20 },
      appointments: { orderBy: { startsAt: "desc" }, take: 20 },
    },
  });
  if (!c) notFound();
  const dnc = await prisma.doNotCall.findUnique({ where: { phone: c.phone } });
  const canEdit = TEAM.includes(user.role);

  return (
    <>
      <Link href="/app/contacts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary"><ArrowLeft size={16} /> Contacts</Link>
      <div className="glass mb-5 flex flex-wrap items-center gap-4 rounded-3xl p-5 sm:p-6">
        <Avatar name={c.name ?? c.phone} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] sm:text-2xl">{c.name || formatPhone(c.phone)}</h1>
          <p className="text-sm text-muted">
            <a href={`tel:${c.phone}`} className="font-semibold text-ink-2">{formatPhone(c.phone)}</a>
            {c.email ? <> · <a href={`mailto:${c.email}`}>{c.email}</a></> : null}
            {c.company ? ` · ${c.company}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <StatusBadge status={c.status} />
            {c.consentAt ? <Badge tone="green">consent</Badge> : <Badge>no consent</Badge>}
            {dnc && <Badge tone="red">on Do-Not-Call list</Badge>}
            {c.nextCallAt && <Badge tone="violet">callback {formatDateTime(c.nextCallAt, s.timezone)}</Badge>}
            {c.tags.map((t) => <Badge key={t} tone="sky">#{t}</Badge>)}
          </div>
        </div>
        {canEdit && !dnc && c.status !== "DNC" && (
          <ActionForm action={callNow} inline submit="Call now" pendingText="Calling…" icon={<Phone size={14} />} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
          </ActionForm>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <Card flush>
            <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Calls" sub={`${c.attempts} automatic attempt${c.attempts === 1 ? "" : "s"}`} icon={PhoneCall} /></div>
            {c.calls.length ? (
              <ul className="divide-y divide-blue-100/70">
                {c.calls.map((call) => (
                  <li key={call.id}>
                    <Link href={`/app/calls/${call.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-white/60 sm:px-6">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{DIRECTION[call.direction]} · {formatDateTime(call.startedAt, s.timezone)}</span>
                        <span className="block truncate text-xs text-muted">{duration(call.durationSec)}{call.summary ? ` · ${call.summary}` : ""}</span>
                      </span>
                      <OutcomeBadge outcome={call.outcome} status={call.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <div className="p-5 sm:p-6"><Empty>No calls yet.</Empty></div>}
          </Card>
          <Card>
            <CardHeader title="Follow-ups & appointments" icon={CalendarCheck} />
            {c.tasks.length || c.appointments.length ? (
              <ul className="space-y-2 text-sm">
                {c.appointments.map((a) => (
                  <li key={`a${a.id}`} className="soft flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
                    <span><b>Appointment</b> · {formatDateTime(a.startsAt, s.timezone)}{a.notes ? ` · ${a.notes}` : ""}</span>
                    <Badge tone={a.status === "BOOKED" ? "green" : a.status === "DONE" ? "blue" : "grey"}>{a.status.toLowerCase()}</Badge>
                  </li>
                ))}
                {c.tasks.map((t) => (
                  <li key={`t${t.id}`} className="soft flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5">
                    <span className="min-w-0"><b>{t.type === "CALLBACK" ? "Callback" : "Follow-up"}</b> · {t.title}</span>
                    <Badge tone={t.status === "DONE" ? "green" : "amber"}>{t.status.toLowerCase().replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            ) : <Empty>Nothing yet.</Empty>}
          </Card>
        </div>

        <Card>
          <CardHeader title="Details" sub="Saved by the team or by the agent during calls" icon={NotebookPen} />
          {canEdit ? (
            <ActionForm action={updateContact} submit="Save">
              <input type="hidden" name="id" value={c.id} />
              <div className="space-y-2.5">
                <input name="name" defaultValue={c.name ?? ""} placeholder="Name" className="input" />
                <input name="email" type="email" defaultValue={c.email ?? ""} placeholder="Email" className="input" />
                <div className="grid grid-cols-2 gap-2.5">
                  <input name="company" defaultValue={c.company ?? ""} placeholder="Company" className="input" />
                  <input name="city" defaultValue={c.city ?? ""} placeholder="City" className="input" />
                </div>
                <input name="tags" defaultValue={c.tags.join(", ")} placeholder="Tags (comma separated)" className="input" />
                <select name="status" defaultValue={c.status} className="input">
                  {Object.entries(CONTACT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <textarea name="notes" defaultValue={c.notes ?? ""} rows={5} placeholder="Notes (the agent sees these on outbound calls)" className="input" />
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="consent" defaultChecked={Boolean(c.consentAt)} className="mt-0.5" /> Consent to AI calls</label>
              </div>
            </ActionForm>
          ) : (
            <p className="whitespace-pre-wrap text-sm text-ink-2">{c.notes || "No notes."}</p>
          )}
          {MANAGERS.includes(user.role) && (
            <form action={deleteContact} className="mt-5 border-t border-blue-100 pt-4">
              <input type="hidden" name="id" value={c.id} />
              <button className="text-sm font-semibold text-rose-700 underline underline-offset-4">Delete contact (calls are kept)</button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
