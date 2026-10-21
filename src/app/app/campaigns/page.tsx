import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleAlert, Clock, Gauge, Megaphone, Users } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { dialerStatus, dueContacts } from "@/lib/dialer";
import { formatPhone } from "@/lib/phone";
import { MANAGERS } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { formatDateTime, usd } from "@/lib/util";
import { ActionForm } from "../_components/ActionForm";
import { AutoRefresh } from "../_components/AutoRefresh";
import { Badge, Card, CardHeader, Empty, PageTitle, Stat } from "../_components/ui";
import { runDialerNow, setOutbound } from "../actions";
import { LiveDialer } from "./LiveDialer";

export const metadata: Metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  await requireUser(MANAGERS);
  const s = await getSettings();
  const [st, due, withConsent, live] = await Promise.all([
    dialerStatus(),
    dueContacts(15),
    prisma.contact.count({ where: { consentAt: { not: null }, status: { notIn: ["DNC", "LOST", "WON"] } } }),
    prisma.call.findMany({ where: { endedAt: null, isTest: false }, orderBy: { startedAt: "desc" }, take: 10, include: { contact: { select: { name: true, phone: true } } } }),
  ]);
  return (
    <>
      <AutoRefresh seconds={15} />
      <PageTitle eyebrow="Agent" title="Outbound campaign" sub="The dialer calls contacts with consent, inside calling hours, skipping Do-Not-Call, up to your line limit and monthly budget.">
        <form action={setOutbound}>
          <input type="hidden" name="on" value={s.outboundEnabled ? "0" : "1"} />
          <button className={s.outboundEnabled ? "btn btn-ghost" : "btn"}>{s.outboundEnabled ? "Switch automatic calling off" : "Switch automatic calling on"}</button>
        </form>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Stat label="Live calls" value={`${st.live}/${s.maxConcurrent}`} hint="Lines in use" icon={Gauge} />
        <Stat label="Due now" value={due.length >= 15 ? "15+" : due.length} hint="Ready to call" icon={Clock} />
        <Stat label="With consent" value={withConsent} hint="Open contacts" icon={Users} />
        <Stat label="Spent this month" value={usd(st.spentCents)} hint={`Budget ${usd(st.budgetCents)}`} icon={Megaphone} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <CardHeader title={st.ready ? "Ready to dial" : "Not dialing"} sub={`Calling hours ${s.callingStart}–${s.callingEnd} (${s.timezone}) · ${s.maxAttempts} attempts · retry after ${s.retryGapMinutes} min`} icon={st.ready ? CheckCircle2 : CircleAlert}>
            {st.ready ? <Badge tone="green" dot>ready</Badge> : <Badge tone="amber" dot>paused</Badge>}
          </CardHeader>
          {!st.ready && (
            <ul className="mb-4 space-y-1.5 text-sm">
              {st.reasons.map((r) => <li key={r} className="rounded-xl bg-amber-50/90 px-3 py-2 text-amber-800 ring-1 ring-amber-600/15">{r}</li>)}
            </ul>
          )}
          <div className="flex flex-col gap-4">
            <ActionForm action={runDialerNow} submit="Run one round now" pendingText="Dialing…" variant="btn-ghost" />
            <LiveDialer />
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted">
            In the background, Vercel Cron calls <code>/api/dialer/tick</code> (once a day on the Hobby plan, every minute on Pro). For non-stop calling on Hobby, point a free scheduler such as cron-job.org at that URL with your <code>CRON_SECRET</code> (see docs/DEPLOY.md), or keep live dialing on here.
          </p>
        </Card>
        <Card flush>
          <div className="p-5 pb-0 sm:p-6 sm:pb-0"><CardHeader title="Next in line" sub="Callbacks first, then oldest" icon={Users} /></div>
          {due.length ? (
            <ul className="divide-y divide-blue-100/70">
              {due.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/contacts/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm hover:bg-white/60 sm:px-6">
                    <span className="min-w-0 truncate font-semibold">{c.name || formatPhone(c.phone)}</span>
                    <span className="shrink-0 text-xs text-muted">{c.nextCallAt ? `callback ${formatDateTime(c.nextCallAt, s.timezone)}` : c.attempts ? `attempt ${c.attempts + 1}` : "first call"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <div className="p-5 sm:p-6"><Empty>Nobody is due. Add contacts with consent.</Empty></div>}
        </Card>
      </div>

      {live.length > 0 && (
        <Card className="mt-5">
          <CardHeader title="Live now" icon={Gauge} />
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((c) => (
              <li key={c.id}><Link href={`/app/calls/${c.id}`} className="soft flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm"><span className="truncate font-semibold">{c.contact?.name || formatPhone(c.contact?.phone ?? c.toNumber ?? "")}</span><Badge tone="amber" dot>{c.status}</Badge></Link></li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
