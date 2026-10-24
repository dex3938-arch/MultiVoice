import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { duration, formatDateTime, usd } from "@/lib/util";
import { AutoRefresh } from "../_components/AutoRefresh";
import { Avatar, Badge, Card, DIRECTION, Empty, OUTCOME, OutcomeBadge, PageTitle, Pager } from "../_components/ui";

export const metadata: Metadata = { title: "Calls" };

const PAGE = 50;

const numberOf = (c: { contact: { phone: string } | null; toNumber: string | null; fromNumber: string | null; direction: string }) => {
  const n = c.contact?.phone ?? (c.direction === "INBOUND" ? c.fromNumber : c.toNumber);
  return n ? formatPhone(n) : "Browser test";
};

export default async function CallsPage({ searchParams }: { searchParams: Promise<{ dir?: string; outcome?: string; page?: string; tests?: string }> }) {
  await requireUser();
  const s = await getSettings();
  const sp = await searchParams;
  const dir = ["INBOUND", "OUTBOUND", "WEB"].includes(sp.dir ?? "") ? (sp.dir as "INBOUND" | "OUTBOUND" | "WEB") : undefined;
  const outcome = Object.hasOwn(OUTCOME, sp.outcome ?? "") ? sp.outcome : undefined;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const where: Prisma.CallWhereInput = {
    ...(dir ? { direction: dir } : sp.tests === "1" ? {} : { isTest: false }),
    ...(outcome ? { outcome: outcome as Prisma.CallWhereInput["outcome"] } : {}),
  };
  const [total, calls] = await Promise.all([
    prisma.call.count({ where }),
    prisma.call.findMany({ where, orderBy: { startedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE, include: { contact: { select: { name: true, phone: true } } } }),
  ]);
  const link = (p: Partial<{ dir: string; outcome: string; page: number }>) => {
    const u = new URLSearchParams();
    const m = { dir, outcome, page, ...p };
    if (m.dir) u.set("dir", m.dir);
    if (m.outcome) u.set("outcome", m.outcome);
    if (m.page && m.page > 1) u.set("page", String(m.page));
    return `/app/calls${u.size ? `?${u}` : ""}`;
  };
  const chip = (active: boolean) => `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${active ? "bg-primary text-white ring-primary" : "bg-white/70 text-ink-2 ring-blue-100"}`;

  return (
    <>
      <AutoRefresh seconds={15} />
      <PageTitle eyebrow="CRM" title="Calls" sub="Every inbound and outbound call with transcript, summary, recording and cost. Updates by itself." />
      <div className="scroll-thin -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 py-1">
        <Link href={link({ dir: "", page: 1 })} className={chip(!dir)}>All</Link>
        <Link href={link({ dir: "INBOUND", page: 1 })} className={chip(dir === "INBOUND")}>Inbound</Link>
        <Link href={link({ dir: "OUTBOUND", page: 1 })} className={chip(dir === "OUTBOUND")}>Outbound</Link>
        <Link href={link({ dir: "WEB", page: 1 })} className={chip(dir === "WEB")}>Browser tests</Link>
        <span className="mx-1 w-px bg-blue-100" />
        {Object.entries(OUTCOME).map(([k, v]) => <Link key={k} href={link({ outcome: outcome === k ? "" : k, page: 1 })} className={chip(outcome === k)}>{v.label}</Link>)}
      </div>
      <Card flush className="overflow-hidden">
        {calls.length ? (
          <>
            <ul className="divide-y divide-blue-100/70 md:hidden">
              {calls.map((c) => (
                <li key={c.id}>
                  <Link href={`/app/calls/${c.id}`} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={c.contact?.name ?? c.contact?.phone} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.contact?.name || numberOf(c)}</span>
                      <span className="block truncate text-xs text-muted">{DIRECTION[c.direction]} · {formatDateTime(c.startedAt, s.timezone)} · {duration(c.durationSec)}</span>
                    </span>
                    <OutcomeBadge outcome={c.outcome} status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="table">
                <thead><tr><th>Contact</th><th>Type</th><th>Via</th><th>When</th><th>Length</th><th>Result</th><th>Summary</th><th>Cost</th></tr></thead>
                <tbody>
                  {calls.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/app/calls/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.contact?.name ?? c.contact?.phone} />
                          <span>
                            <span className="block font-bold">{c.contact?.name || "—"}</span>
                            <span className="block text-xs text-muted">{numberOf(c)}</span>
                          </span>
                        </Link>
                      </td>
                      <td><Badge tone={c.direction === "INBOUND" ? "sky" : c.direction === "OUTBOUND" ? "blue" : "grey"}>{DIRECTION[c.direction]}</Badge></td>
                      <td><Badge tone={c.provider === "dograh" ? "violet" : "blue"}>{c.provider === "dograh" ? "Dograh" : "Vapi"}</Badge></td>
                      <td className="whitespace-nowrap text-sm">{formatDateTime(c.startedAt, s.timezone)}</td>
                      <td className="digits text-sm">{duration(c.durationSec)}</td>
                      <td><OutcomeBadge outcome={c.outcome} status={c.status} /></td>
                      <td className="max-w-80"><Link href={`/app/calls/${c.id}`} className="line-clamp-2 text-sm text-ink-2">{c.summary || c.endedReason || "—"}</Link></td>
                      <td className="text-sm text-muted">{c.costCents != null ? usd(c.costCents) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={Math.ceil(total / PAGE)} href={(p) => link({ page: p })} />
          </>
        ) : <div className="p-5"><Empty>No calls yet.</Empty></div>}
      </Card>
    </>
  );
}
