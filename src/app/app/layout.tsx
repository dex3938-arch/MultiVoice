import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Headset, LogOut, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { ADMINS, MANAGERS, ROLE_LABELS } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { logout } from "../actions";
import { Nav } from "./_components/Nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Portal", template: "%s · MultiVoice" }, robots: { index: false, follow: false } };

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date()));
  return h >= 4 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : "Good evening";
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [openTasks, s] = await Promise.all([prisma.task.count({ where: { status: { not: "DONE" } } }), getSettings()]);
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: s.timezone }).format(new Date());
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <Nav
        canManage={MANAGERS.includes(user.role)}
        isAdmin={ADMINS.includes(user.role)}
        openTasks={openTasks}
        user={{ name: user.name, role: ROLE_LABELS[user.role] }}
        footer={
          <form action={logout}>
            <button type="submit" title="Sign out" aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-blue-50 hover:text-ink">
              <LogOut size={17} />
            </button>
          </form>
        }
      />
      <div className="min-w-0">
        <header className="sticky top-0 z-20 hidden border-b border-white/70 bg-white/55 backdrop-blur-xl lg:block">
          <div className="flex h-[72px] items-center gap-5 px-8 xl:px-10">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1.02rem] font-bold">{greeting(s.timezone)}, {user.name.split(" ")[0]}</p>
              <p className="truncate text-[0.8rem] text-muted">{today} · {s.businessName}</p>
            </div>
            <form action="/app/contacts" className="relative hidden w-full max-w-sm xl:block">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input name="q" placeholder="Search contacts by name, number, company…" className="input h-11 rounded-2xl pl-10" />
            </form>
            <Link href="/app/follow-ups" className="relative grid h-11 w-11 place-items-center rounded-2xl text-ink-2 transition-colors hover:bg-white/80" aria-label={openTasks ? `${openTasks} open follow-ups` : "Follow-ups"}>
              <Bell size={20} />
              {openTasks > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
            </Link>
            <Link href="/app/test-call" className="btn h-11 rounded-2xl px-5"><Headset size={18} /> Test call</Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1360px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 xl:px-10">{children}</main>
      </div>
    </div>
  );
}
