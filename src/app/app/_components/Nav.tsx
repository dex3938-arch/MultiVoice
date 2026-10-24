"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlarmClock, BookOpen, CalendarCheck, Headset, LayoutDashboard, Megaphone, Menu, PhoneCall, ShieldCheck, SlidersHorizontal, Users, X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/util";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number };

/** Frosted white sidebar (desktop) + slide-in drawer and bottom bar (mobile). */
export function Nav({ canManage, isAdmin, openTasks, user, footer }: { canManage: boolean; isAdmin: boolean; openTasks: number; user: { name: string; role: string }; footer: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const groups: { title: string; items: Item[] }[] = [
    { title: "Overview", items: [{ href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
    {
      title: "CRM",
      items: [
        { href: "/app/contacts", label: "Contacts", icon: Users },
        { href: "/app/calls", label: "Calls", icon: PhoneCall },
        { href: "/app/follow-ups", label: "Follow-ups", icon: AlarmClock, badge: openTasks },
        { href: "/app/appointments", label: "Appointments", icon: CalendarCheck },
      ],
    },
    {
      title: "Agent",
      items: [
        { href: "/app/test-call", label: "Test call", icon: Headset },
        ...(canManage ? [{ href: "/app/campaigns", label: "Campaigns", icon: Megaphone }] : []),
        { href: "/app/knowledge", label: "Knowledge", icon: BookOpen },
      ],
    },
    ...(canManage || isAdmin
      ? [{
          title: "Admin",
          items: [
            ...(canManage ? [{ href: "/app/settings", label: "Settings", icon: SlidersHorizontal }] : []),
            ...(isAdmin ? [{ href: "/app/users", label: "Users", icon: ShieldCheck }] : []),
          ],
        }]
      : []),
  ];
  const isActive = (i: Item) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`));
  const initials = user.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const panel = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Link href="/app" aria-label="MultiVoice dashboard"><Logo /></Link>
      </div>
      <nav aria-label="Portal" className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[0.66rem] font-extrabold uppercase tracking-[0.16em] text-muted/80">{g.title}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[0.9rem] font-semibold transition-colors",
                        active ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-[0_10px_22px_-12px_rgb(37_99_235/0.9)]" : "text-ink-2 hover:bg-white/80 hover:text-ink",
                      )}
                    >
                      <Icon size={18} strokeWidth={2.1} className={active ? "text-white" : "text-primary/80"} />
                      {item.label}
                      {item.badge ? (
                        <span className={cn("ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold leading-none", active ? "bg-white text-primary" : "bg-primary text-white")}>{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/70 p-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white/60 px-2.5 py-2 ring-1 ring-white">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-xs font-bold text-white">{initials}</span>
          <Link href="/app/account" className="min-w-0 flex-1" title="My account">
            <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
            <span className="block truncate text-xs text-muted">{user.role} · My account</span>
          </Link>
          {footer}
        </div>
      </div>
    </div>
  );

  const bottom: Item[] = [
    { href: "/app", label: "Home", icon: LayoutDashboard, exact: true },
    { href: "/app/contacts", label: "Contacts", icon: Users },
    { href: "/app/calls", label: "Calls", icon: PhoneCall },
    { href: "/app/follow-ups", label: "Tasks", icon: AlarmClock, badge: openTasks },
  ];

  return (
    <>
      {/* Mobile top bar */}
      <div className="glass sticky top-0 z-30 flex items-center justify-between rounded-none border-x-0 border-t-0 px-4 py-2.5 lg:hidden">
        <Link href="/app" aria-label="Dashboard"><Logo /></Link>
        <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-ink ring-1 ring-blue-100" aria-label="Open menu" aria-expanded={open}>
          <Menu size={20} />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="glass hidden rounded-none border-y-0 border-l-0 lg:sticky lg:top-0 lg:block lg:h-svh">{panel}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-blue-950/30 backdrop-blur-sm" />
          <aside className="glass-strong absolute inset-y-0 left-0 w-[284px] max-w-[85vw] rounded-r-3xl">
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-blue-50" aria-label="Close menu">
              <X size={18} />
            </button>
            {panel}
          </aside>
        </div>
      )}

      {/* Mobile bottom bar */}
      <nav aria-label="Quick" className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-2xl px-1 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden">
        {bottom.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.68rem] font-bold", active ? "text-primary" : "text-muted")}>
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              {item.label}
              {item.badge ? <span className="absolute right-[calc(50%-18px)] top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /> : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
