import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { TEAM } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { dayKey, formatDate } from "@/lib/util";
import { Badge, Card, Empty, PageTitle } from "../_components/ui";
import { setAppointmentStatus } from "../actions";

export const metadata: Metadata = { title: "Appointments" };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const user = await requireUser();
  const s = await getSettings();
  const past = (await searchParams).past === "1";
  const now = new Date();
  const list = await prisma.appointment.findMany({
    where: past ? { startsAt: { lt: now } } : { startsAt: { gte: new Date(now.getTime() - 2 * 3_600_000) } },
    orderBy: { startsAt: past ? "desc" : "asc" },
    take: 150,
    include: { contact: { select: { id: true, name: true, phone: true, company: true } } },
  });
  const groups = new Map<string, typeof list>();
  for (const a of list) {
    const k = dayKey(a.startsAt, s.timezone);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const time = (d: Date) => new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: s.timezone }).format(d);
  const canEdit = TEAM.includes(user.role);
  return (
    <>
      <PageTitle eyebrow="CRM" title="Appointments" sub={`Booked by the agent on calls (times in ${s.timezone}).`}>
        <Link href={past ? "/app/appointments" : "/app/appointments?past=1"} className="btn btn-ghost">{past ? "Upcoming" : "Past"}</Link>
      </PageTitle>
      {list.length ? (
        <div className="space-y-5">
          {[...groups.entries()].map(([k, items]) => (
            <section key={k}>
              <h2 className="mb-2 text-sm font-extrabold text-ink-2">{formatDate(items[0].startsAt, s.timezone)}</h2>
              <Card flush>
                <ul className="divide-y divide-blue-100/70">
                  {items.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="digits w-20 text-sm">{time(a.startsAt)}</span>
                      <span className="min-w-0 flex-1">
                        {a.contact ? <Link href={`/app/contacts/${a.contact.id}`} className="block truncate text-sm font-bold hover:underline">{a.contact.name || formatPhone(a.contact.phone)}</Link> : <span className="block text-sm font-bold">Browser test</span>}
                        <span className="block truncate text-xs text-muted">{[a.contact?.company, a.notes].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                      <Badge tone={a.status === "BOOKED" ? "green" : a.status === "DONE" ? "blue" : "grey"}>{a.status.toLowerCase()}</Badge>
                      {canEdit && a.status === "BOOKED" && (
                        <span className="flex gap-2">
                          <form action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="DONE" /><button className="btn btn-ghost btn-sm">Done</button></form>
                          <form action={setAppointmentStatus}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="CANCELLED" /><button className="btn btn-ghost btn-sm text-rose-700">Cancel</button></form>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      ) : <Empty>{past ? "No past appointments." : "No upcoming appointments."}</Empty>}
    </>
  );
}
