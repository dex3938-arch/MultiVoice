import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/util";

export function Card({ className, flush = false, children }: { className?: string; flush?: boolean; children: React.ReactNode }) {
  return <div className={cn("glass rounded-3xl", !flush && "p-5 sm:p-6", className)}>{children}</div>;
}

export function CardHeader({ title, sub, icon: Icon, children }: { title: string; sub?: string; icon?: LucideIcon; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_8px_18px_-8px_rgb(37_99_235/0.7)]">
            <Icon size={18} strokeWidth={2.2} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-bold text-ink">{title}</h2>
          {sub && <p className="text-xs text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export function PageTitle({ title, sub, eyebrow, children }: { title: string; sub?: string; eyebrow?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-7">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2 text-primary">{eyebrow}</p>}
        <h1 className="text-[1.6rem] font-extrabold leading-tight tracking-[-0.025em] text-ink sm:text-[1.9rem]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

const TONES = {
  green: "bg-emerald-50/90 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50/90 text-amber-700 ring-amber-600/20",
  red: "bg-rose-50/90 text-rose-700 ring-rose-600/15",
  blue: "bg-blue-50/90 text-blue-700 ring-blue-600/15",
  sky: "bg-sky-50/90 text-sky-700 ring-sky-600/15",
  violet: "bg-violet-50/90 text-violet-700 ring-violet-600/15",
  grey: "bg-slate-100/90 text-slate-600 ring-slate-500/15",
} as const;
const DOTS = { green: "bg-emerald-500", amber: "bg-amber-500", red: "bg-rose-500", blue: "bg-blue-500", sky: "bg-sky-500", violet: "bg-violet-500", grey: "bg-slate-400" } as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "grey", dot = false, children }: { tone?: Tone; dot?: boolean; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset", TONES[tone])}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} />}
      {children}
    </span>
  );
}

export const OUTCOME: Record<string, { label: string; tone: Tone }> = {
  APPOINTMENT_BOOKED: { label: "Appointment", tone: "green" },
  CALLBACK: { label: "Callback", tone: "violet" },
  INTERESTED: { label: "Interested", tone: "blue" },
  NOT_INTERESTED: { label: "Not interested", tone: "grey" },
  FOLLOW_UP: { label: "Follow-up", tone: "amber" },
  TRANSFERRED: { label: "Transferred", tone: "sky" },
  DNC: { label: "Do not call", tone: "red" },
  COMPLETED: { label: "Completed", tone: "blue" },
  NO_ANSWER: { label: "No answer", tone: "grey" },
  BUSY: { label: "Busy", tone: "amber" },
  VOICEMAIL: { label: "Voicemail", tone: "grey" },
  FAILED: { label: "Failed", tone: "red" },
};

export const CONTACT_STATUS: Record<string, { label: string; tone: Tone }> = {
  NEW: { label: "New", tone: "sky" },
  CONTACTED: { label: "Contacted", tone: "blue" },
  INTERESTED: { label: "Interested", tone: "violet" },
  APPOINTMENT: { label: "Appointment", tone: "green" },
  WON: { label: "Won", tone: "green" },
  LOST: { label: "Lost", tone: "grey" },
  DNC: { label: "Do not call", tone: "red" },
};

export const DIRECTION: Record<string, string> = { INBOUND: "Inbound", OUTBOUND: "Outbound", WEB: "Browser test" };

export function OutcomeBadge({ outcome, status }: { outcome?: string | null; status?: string }) {
  if (!outcome) return <Badge tone="amber" dot>{status === "ringing" ? "Ringing" : status === "queued" ? "Queued" : "Live"}</Badge>;
  const o = OUTCOME[outcome] ?? { label: outcome, tone: "grey" as Tone };
  return <Badge tone={o.tone} dot>{o.label}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const s = CONTACT_STATUS[status] ?? { label: status, tone: "grey" as Tone };
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function Stat({ label, value, hint, icon: Icon }: { label: string; value: React.ReactNode; hint?: string; icon?: LucideIcon }) {
  return (
    <Card className="card-hover p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.85rem] font-semibold text-muted">{label}</p>
          <p className="digits mt-2 text-[2rem] leading-none sm:text-[2.5rem]">{value}</p>
          {hint && <p className="mt-2 text-[0.8rem] text-muted">{hint}</p>}
        </div>
        {Icon && (
          <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary ring-1 ring-blue-200/60 sm:grid">
            <Icon size={20} strokeWidth={2.1} />
          </span>
        )}
      </div>
    </Card>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="soft rounded-2xl px-4 py-10 text-center text-sm font-medium text-muted">{children}</p>;
}

export function Avatar({ name }: { name?: string | null }) {
  const words = (name ?? "").trim().split(/\s+/).filter((p) => /^\p{L}/u.test(p));
  const initials = words.map((p) => p[0]).join("").slice(0, 2).toUpperCase() || (name?.replace(/\D/g, "").slice(-2) ?? "") || "?";
  return <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-blue-100 text-[0.75rem] font-extrabold text-blue-800 ring-1 ring-blue-200/70">{initials}</span>;
}

/** Previous / next links for long lists. */
export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      {page > 1 ? <a className="btn btn-ghost btn-sm" href={href(page - 1)}>← Previous</a> : <span />}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? <a className="btn btn-ghost btn-sm" href={href(page + 1)}>Next →</a> : <span />}
    </nav>
  );
}
