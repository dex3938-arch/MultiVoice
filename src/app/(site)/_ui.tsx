import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Menu, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PAGES, type PageKey } from "@/lib/seo";

const NAV: PageKey[] = ["features", "inbound", "outbound", "integrations", "security", "faq"];

/** Structured data, escaped so text can never close the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Header without client JavaScript: a slim top bar, then the main bar; the phone menu is a <details> element. */
export function SiteHeader({ current }: { current: PageKey }) {
  return (
    <>
      <div className="hidden bg-navy text-[0.78rem] text-white/80 md:block">
        <div className="mx-auto flex h-9 max-w-6xl items-center justify-between px-4 sm:px-6">
          <p className="flex items-center gap-2"><ShieldCheck size={14} className="text-sky-300" /> Two-factor secured portal · Works with Vapi, Twilio and Dograh</p>
          <nav aria-label="Utility" className="flex items-center gap-5">
            <Link href="/faq" className="hover:text-white">Help centre</Link>
            <Link href="/security" className="hover:text-white">Trust &amp; security</Link>
            <Link href="/login" className="font-semibold text-white hover:underline">Customer sign-in</Link>
          </nav>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-blue-100/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="MultiVoice home"><Logo /></Link>
          <nav aria-label="Main" className="hidden items-center gap-1 text-[0.92rem] font-semibold text-ink-2 lg:flex">
            {NAV.map((k) => (
              <Link
                key={k}
                href={PAGES[k].path}
                aria-current={current === k ? "page" : undefined}
                className={`rounded-lg px-3 py-2 transition-colors ${current === k ? "text-primary" : "hover:bg-blue-50 hover:text-primary"}`}
              >
                {PAGES[k].nav}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-sm sm:h-10 sm:px-5">Get started <ArrowRight size={15} /></Link>
            <details className="relative lg:hidden">
              <summary className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl bg-white ring-1 ring-blue-100" aria-label="Menu"><Menu size={19} /></summary>
              <nav aria-label="Mobile" className="glass-strong absolute right-0 top-12 w-64 rounded-2xl p-2">
                {NAV.map((k) => (
                  <Link key={k} href={PAGES[k].path} className={`block rounded-xl px-3 py-2.5 text-sm font-semibold ${current === k ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-blue-50"}`}>
                    {PAGES[k].nav}
                  </Link>
                ))}
                <Link href="/login" className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-semibold text-primary hover:bg-blue-50">Customer sign-in</Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}

/** Corporate footer: brand, three link columns, bottom bar. */
export function SiteFooter() {
  const col = (title: string, keys: PageKey[]) => (
    <div>
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {keys.map((k) => (
          <li key={k}><Link href={PAGES[k].path} className="text-white/70 transition-colors hover:text-white">{k === "inbound" ? "AI receptionist" : k === "outbound" ? "Outbound campaigns" : PAGES[k].nav}</Link></li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="mt-16 bg-navy text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">The AI calling agent with its own CRM, for teams that cannot afford to miss a call or a follow-up.</p>
          <Link href="/login" className="btn btn-white btn-sm mt-5">Open the portal <ArrowRight size={14} /></Link>
        </div>
        {col("Product", ["features", "inbound", "outbound"])}
        {col("Platform", ["integrations", "security"])}
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-white">Support</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/faq" className="text-white/70 hover:text-white">FAQ</Link></li>
            <li><Link href="/login" className="text-white/70 hover:text-white">Customer sign-in</Link></li>
            <li><a href="/.well-known/security.txt" className="text-white/70 hover:text-white">Report a security issue</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/60 sm:px-6">
          <p>© {new Date().getFullYear()} MultiVoice Calling Agent. All rights reserved.</p>
          <p>Calls are placed only to contacts with recorded consent.</p>
        </div>
      </div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, intro, children }: { eyebrow: string; title: React.ReactNode; intro: string; children?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 md:pt-16">
      <p className="eyebrow text-primary">{eyebrow}</p>
      <h1 className="mt-3 max-w-4xl text-[2.1rem] font-extrabold leading-[1.1] tracking-[-0.035em] sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">{intro}</p>
      {children}
    </section>
  );
}

export function Section({ id, title, lead, children }: { id?: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6">
      <h2 className="max-w-3xl text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{title}</h2>
      {lead && <p className="mt-3 max-w-3xl leading-relaxed text-muted">{lead}</p>}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export function FeatureGrid({ items, cols = 3 }: { items: { icon: LucideIcon; title: string; body: string }[]; cols?: 2 | 3 | 4 }) {
  const grid = cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-4 ${grid}`}>
      {items.map((f) => (
        <article key={f.title} className="glass card-hover rounded-3xl p-5">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_10px_20px_-10px_rgb(37_99_235/0.8)]"><f.icon size={20} /></span>
          <h3 className="mt-4 font-bold">{f.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
        </article>
      ))}
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <div className="glass max-w-none space-y-4 rounded-3xl p-6 text-[0.95rem] leading-relaxed text-ink-2 sm:p-8 [&_h3]:pt-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink">{children}</div>;
}

export function Cta({ title, body }: { title: string; body: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="glass-blue relative overflow-hidden rounded-[2rem] px-6 py-10 text-center sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <h2 className="relative text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{title}</h2>
        <p className="relative mx-auto mt-3 max-w-xl text-white/85">{body}</p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="btn btn-white h-12 rounded-2xl px-6">Open the portal <ArrowRight size={17} /></Link>
          <Link href="/faq" className="btn h-12 rounded-2xl border-white/40 bg-white/10 px-6 shadow-none">Read the FAQ</Link>
        </div>
      </div>
    </section>
  );
}

/** Links to the other pages at the end of each page (internal linking, no repeated copy). */
export function Related({ keys }: { keys: PageKey[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
      <h2 className="text-lg font-extrabold">Keep reading</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {keys.map((k) => (
          <Link key={k} href={PAGES[k].path} className="glass card-hover rounded-2xl p-4">
            <p className="font-bold text-ink">{PAGES[k].nav === "Inbound" ? "AI receptionist" : PAGES[k].nav === "Outbound" ? "Outbound campaigns" : PAGES[k].nav}</p>
            <p className="mt-1 text-sm text-muted">{PAGES[k].teaser} →</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
