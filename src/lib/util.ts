export const cn = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

export const DEFAULT_TZ = "Asia/Kolkata";

export const formatDateTime = (d: Date, timeZone = DEFAULT_TZ) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(d);

export const formatDate = (d: Date, timeZone = DEFAULT_TZ) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone }).format(d);

export const usd = (cents: number) => `$${(cents / 100).toFixed(cents >= 10_000 ? 0 : 2)}`;

export function duration(sec?: number | null) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

/** "due in 5h", "overdue 2h" for the follow-up clock. */
export function dueIn(dueAt: Date, now = new Date()) {
  const h = Math.round((dueAt.getTime() - now.getTime()) / 3_600_000);
  if (h < 0) return { text: `overdue ${-h}h`, tone: "red" as const };
  if (h <= 12) return { text: `due in ${h}h`, tone: "amber" as const };
  return { text: `due in ${h}h`, tone: "green" as const };
}

export function timeAgo(d: Date, now = new Date(), timeZone = DEFAULT_TZ) {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone }).format(d);
}

/** Calendar day in the business time zone, e.g. "2026-10-20". */
export const dayKey = (d: Date, timeZone = DEFAULT_TZ) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);

/** Minutes since midnight in the business time zone. */
export function minutesIn(timeZone: string, now = new Date()) {
  const p = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).formatToParts(now);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}

/** Start of today (midnight) in the business time zone, as a Date. */
export function startOfDay(timeZone: string, now = new Date()) {
  const key = dayKey(now, timeZone);
  // Offset of the zone at this moment, in minutes.
  const local = new Date(new Date(now).toLocaleString("en-US", { timeZone }));
  const offset = Math.round((local.getTime() - now.getTime()) / 60_000);
  return new Date(Date.parse(`${key}T00:00:00Z`) - offset * 60_000);
}
