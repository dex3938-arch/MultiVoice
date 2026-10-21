import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Upload, UserPlus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { formatPhone } from "@/lib/phone";
import { TEAM } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/util";
import { ActionForm } from "../_components/ActionForm";
import { Avatar, Badge, CONTACT_STATUS, Card, Empty, PageTitle, Pager, StatusBadge } from "../_components/ui";
import { addContact, callNow, importContacts } from "../actions";

export const metadata: Metadata = { title: "Contacts" };

const PAGE = 50;

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requireUser();
  const s = await getSettings();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const status = Object.hasOwn(CONTACT_STATUS, sp.status ?? "") ? sp.status : undefined;
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1));
  const digits = q.replace(/\D/g, "");
  const where: Prisma.ContactWhereInput = {
    ...(status ? { status: status as Prisma.ContactWhereInput["status"] } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
            { tags: { has: q.toLowerCase() } },
          ],
        }
      : {}),
  };
  const [total, contacts, counts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.contact.groupBy({ by: ["status"], _count: true }),
  ]);
  const canEdit = TEAM.includes(user.role);
  const pages = Math.ceil(total / PAGE);
  const link = (p: Partial<{ q: string; status: string; page: number }>) => {
    const u = new URLSearchParams();
    const merged = { q, status, page, ...p };
    if (merged.q) u.set("q", merged.q);
    if (merged.status) u.set("status", merged.status);
    if (merged.page && merged.page > 1) u.set("page", String(merged.page));
    const qs = u.toString();
    return `/app/contacts${qs ? `?${qs}` : ""}`;
  };
  const all = counts.reduce((a, c) => a + c._count, 0);

  return (
    <>
      <PageTitle eyebrow="CRM" title="Contacts" sub="Everyone the agent can call or has spoken to. Automatic calls only go to contacts with consent." />

      {canEdit && (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <details className="glass group rounded-3xl p-5 sm:p-6">
            <summary className="flex cursor-pointer items-center gap-2 font-bold"><UserPlus size={18} className="text-primary" /> Add a contact</summary>
            <ActionForm action={addContact} submit="Add contact" resetOnOk className="mt-4">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <input name="name" placeholder="Name" className="input" />
                <input name="phone" required placeholder={`Phone (${s.defaultCountry} …)`} inputMode="tel" className="input" />
                <input name="email" type="email" placeholder="Email" className="input" />
                <input name="company" placeholder="Company" className="input" />
                <input name="city" placeholder="City" className="input" />
                <input name="tags" placeholder="Tags (comma separated)" className="input" />
              </div>
              <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" name="consent" className="mt-0.5" /> They agreed to be called by an AI assistant</label>
            </ActionForm>
          </details>
          <details className="glass rounded-3xl p-5 sm:p-6">
            <summary className="flex cursor-pointer items-center gap-2 font-bold"><Upload size={18} className="text-primary" /> Import a CSV</summary>
            <p className="mt-3 text-sm text-muted">Header row: <code className="rounded bg-primary-soft px-1">name, phone, email, company, city, tags, consent</code>. Only <b>phone</b> is required; consent = yes/no. Up to 5000 rows.</p>
            <ActionForm action={importContacts} submit="Import" pendingText="Importing…" resetOnOk className="mt-3">
              <input type="file" name="file" accept=".csv,text/csv" required className="input pt-2.5" />
            </ActionForm>
          </details>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form action="/app/contacts" className="w-full sm:w-80">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search name, phone, company, tag…" className="input" />
        </form>
        <div className="scroll-thin -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-1">
          <Link href={link({ status: "", page: 1 })} className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${!status ? "bg-primary text-white ring-primary" : "bg-white/70 text-ink-2 ring-blue-100"}`}>All {all}</Link>
          {Object.entries(CONTACT_STATUS).map(([k, v]) => (
            <Link key={k} href={link({ status: k, page: 1 })} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${status === k ? "bg-primary text-white ring-primary" : "bg-white/70 text-ink-2 ring-blue-100"}`}>
              {v.label} {counts.find((c) => c.status === k)?._count ?? 0}
            </Link>
          ))}
        </div>
      </div>

      <Card flush className="overflow-hidden">
        {contacts.length ? (
          <>
            {/* Phones: cards */}
            <ul className="divide-y divide-blue-100/70 md:hidden">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={c.name ?? c.phone} />
                  <Link href={`/app/contacts/${c.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{c.name || formatPhone(c.phone)}</span>
                    <span className="block truncate text-xs text-muted">{formatPhone(c.phone)}{c.company ? ` · ${c.company}` : ""}</span>
                  </Link>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
            {/* Tablet and desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="table">
                <thead><tr><th>Contact</th><th>Company</th><th>Status</th><th>Consent</th><th>Attempts</th><th className="hidden xl:table-cell">Added</th><th /></tr></thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/app/contacts/${c.id}`} className="flex items-center gap-3">
                          <Avatar name={c.name ?? c.phone} />
                          <span className="min-w-0">
                            <span className="block truncate font-bold">{c.name || "—"}</span>
                            <span className="block text-xs text-muted">{formatPhone(c.phone)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="max-w-48 truncate">{c.company || "—"}{c.city ? <div className="text-xs text-muted">{c.city}</div> : null}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.consentAt ? <Badge tone="green">yes</Badge> : <Badge>no</Badge>}</td>
                      <td className="digits text-sm">{c.attempts}</td>
                      <td className="hidden whitespace-nowrap text-sm text-muted xl:table-cell">{timeAgo(c.createdAt, new Date(), s.timezone)}</td>
                      <td className="whitespace-nowrap text-right">
                        {canEdit && c.status !== "DNC" && (
                          <ActionForm action={callNow} inline submit="Call" pendingText="Calling…" icon={<Phone size={14} />}>
                            <input type="hidden" name="id" value={c.id} />
                          </ActionForm>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={pages} href={(p) => link({ page: p })} />
          </>
        ) : (
          <div className="p-5"><Empty>{q || status ? "No contacts match." : "No contacts yet. Add one or import a CSV."}</Empty></div>
        )}
      </Card>
    </>
  );
}
