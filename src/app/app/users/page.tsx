import type { Metadata } from "next";
import { UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { ADMINS, ROLE_LABELS, ROLES } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { formatDateTime } from "@/lib/util";
import { ActionForm } from "../_components/ActionForm";
import { Avatar, Badge, Card, CardHeader, PageTitle } from "../_components/ui";
import { createUser, resetUserMfa, setUserRole, toggleUser } from "../actions";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireUser(ADMINS);
  const s = await getSettings();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageTitle eyebrow="Admin" title="Users" sub="Everyone must set up two-factor sign-in (authenticator app) the first time they sign in." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card flush className="overflow-hidden">
          <ul className="divide-y divide-blue-100/70">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Avatar name={u.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{u.name}{u.id === me.id ? " (you)" : ""}</span>
                  <span className="block truncate text-xs text-muted">{u.email} · last sign-in {u.lastLoginAt ? formatDateTime(u.lastLoginAt, s.timezone) : "never"}</span>
                </span>
                {u.mfaEnabledAt ? <Badge tone="green" dot>2FA on</Badge> : <Badge tone="amber" dot>2FA not set</Badge>}
                {u.active ? <Badge tone="blue">active</Badge> : <Badge>off</Badge>}
                {u.id === me.id ? (
                  <Badge tone="violet">{ROLE_LABELS[u.role]}</Badge>
                ) : (
                  <span className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <form action={setUserRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <select name="role" defaultValue={u.role} className="input h-9 w-36 text-xs">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
                      <button className="btn btn-ghost btn-sm">Set</button>
                    </form>
                    <form action={toggleUser}><input type="hidden" name="id" value={u.id} /><button className="btn btn-ghost btn-sm">{u.active ? "Deactivate" : "Activate"}</button></form>
                    {u.mfaEnabledAt && <form action={resetUserMfa}><input type="hidden" name="id" value={u.id} /><button className="btn btn-ghost btn-sm text-rose-700" title="Lost phone: they set up a new authenticator at next sign-in">Reset 2FA</button></form>}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Add a user" icon={UserPlus} />
          <ActionForm action={createUser} submit="Create user" resetOnOk>
            <div className="space-y-2.5">
              <input name="name" placeholder="Full name" required className="input" />
              <input name="email" type="email" placeholder="Email" required className="input" />
              <input name="password" type="password" placeholder={`Temporary password (${MIN_PASSWORD_LENGTH}+ characters)`} required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className="input" />
              <select name="role" className="input" defaultValue="AGENT">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
            </div>
          </ActionForm>
          <ul className="mt-5 space-y-1 text-xs text-muted">
            <li><b>Super Admin</b>: everything, including users.</li>
            <li><b>Manager</b>: settings, campaigns, knowledge.</li>
            <li><b>Agent</b>: contacts, calls, follow-ups.</li>
            <li><b>Viewer</b>: read only.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
