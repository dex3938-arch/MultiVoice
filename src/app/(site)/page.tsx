import Link from "next/link";
import {
  ArrowRight, BookOpen, Building2, CalendarCheck, Check, CheckCircle2, GraduationCap, HeartPulse, Home as HomeIcon, Landmark, PhoneIncoming,
  PhoneOutgoing, ShoppingBag, Wrench,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { PAGES, breadcrumb, pageMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { JsonLd, SiteFooter, SiteHeader } from "./_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("home");

/** Section heading in the classic corporate style: small rule + eyebrow, title, lead. */
function Heading({ eyebrow, title, lead, center = false }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`flex items-center gap-2 text-[0.78rem] font-extrabold uppercase tracking-[0.18em] text-primary ${center ? "justify-center" : ""}`}>
        <span className="h-0.5 w-6 rounded bg-primary" /> {eyebrow}
      </p>
      <h2 className="mt-3 text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] text-ink sm:text-[2.4rem]">{title}</h2>
      {lead && <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

const SERVICES = [
  {
    icon: PhoneIncoming,
    title: "AI receptionist",
    body: "Picks up on the first ring at any hour, answers routine questions from your documents and books the caller in.",
    href: "/inbound-call-answering",
  },
  {
    icon: PhoneOutgoing,
    title: "Outbound campaigns",
    body: "Works through consented contact lists inside your calling hours, retries missed calls and respects every opt-out.",
    href: "/outbound-calling",
  },
  {
    icon: BookOpen,
    title: "Knowledge-driven answers",
    body: "Reads FAQs, policies and long manuals, then replies with the exact fact a caller asked for in one or two sentences.",
    href: "/features",
  },
];

const FACTS = [
  ["24 / 7", "Calls answered every day of the year"],
  ["2", "Voice providers with automatic failover"],
  ["7", "Actions the agent can take on a call"],
  ["600+", "Page manuals read and searchable"],
];

const STEPS = [
  ["01", "Connect", "Paste your Vapi, Twilio and optional Dograh keys and run the setup command."],
  ["02", "Teach", "Upload FAQs, brochures or manuals and check answers in the knowledge tester."],
  ["03", "Test", "Talk to the assistant from your browser before any customer hears it."],
  ["04", "Go live", "Point callers at your number and switch on the dialer for outbound."],
];

const INDUSTRIES = [
  { icon: GraduationCap, name: "Education & training", text: "Course details, fees, batch timings and counselling bookings." },
  { icon: HeartPulse, name: "Clinics & healthcare", text: "Appointment requests, opening hours and visit preparation." },
  { icon: HomeIcon, name: "Real estate", text: "Site-visit scheduling and first-round buyer qualification." },
  { icon: Landmark, name: "Finance & insurance", text: "Renewal reminders, document checklists and callback requests." },
  { icon: ShoppingBag, name: "Retail & e-commerce", text: "Order questions, store hours and return policies." },
  { icon: Wrench, name: "Home & field services", text: "Job booking, technician slots and follow-up calls." },
];

export default function Home() {
  const site = siteUrl();
  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "Organization", name: "MultiVoice", url: site, logo: `${site}/logo.svg` },
          { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "MultiVoice Calling Agent", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: site, description: PAGES.home.description },
          breadcrumb("home"),
        ]}
      />
      <SiteHeader current="home" />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-blue-100/70 bg-gradient-to-b from-white to-[#eef4ff]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
            <div>
              <h1 className="text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[3.1rem] lg:text-[3.5rem]">
                The phone agent that answers, follows up and <span className="text-primary">books the next step</span>.
              </h1>
              <p className="mt-6 max-w-xl text-[1.08rem] leading-relaxed text-muted">
                MultiVoice gives your business a trained AI voice on every line. It handles enquiries around the clock, calls back the leads
                your team could not reach, and records each conversation in a CRM your staff already understand.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="btn h-12 rounded-xl px-7 text-base">Get started <ArrowRight size={18} /></Link>
                <Link href="/features" className="btn btn-ghost h-12 rounded-xl px-7 text-base">Explore features</Link>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-2">
                {["No long-term contract", "Set up in an afternoon", "Your data, your database"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><CheckCircle2 size={17} className="text-emerald-600" /> {t}</li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="rounded-[1.6rem] border border-blue-100 bg-white p-5 shadow-[0_40px_80px_-40px_rgb(15_42_107/0.45)] sm:p-6">
                <div className="flex items-center justify-between border-b border-blue-50 pb-4">
                  <span className="flex items-center gap-2.5 text-sm font-bold"><LogoMark size={30} /> Incoming call</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live 00:42</span>
                </div>
                <ol className="mt-4 space-y-2.5 text-sm">
                  <li className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-white">What is Java, and is your course good for beginners?</li>
                  <li className="max-w-[90%] rounded-2xl rounded-bl-md bg-[#f2f6ff] px-4 py-2.5 text-ink">Java is an object-oriented programming language used worldwide for app development. Our course starts from zero, so beginners are welcome.</li>
                  <li className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-white">Great. Can someone call me on Friday morning?</li>
                </ol>
                <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs font-bold">
                  <span className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-violet-800"><CalendarCheck size={15} /> Callback Fri 11:00</span>
                  <span className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-emerald-800"><Check size={15} /> Saved to CRM</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-xl sm:block">
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-muted">Knowledge lookup</p>
                <p className="digits text-xl">19 ms</p>
              </div>
            </div>
          </div>
        </section>

        {/* Integration strip */}
        <section className="border-b border-blue-100/70 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 sm:px-6 md:flex-row md:justify-between">
            <p className="text-sm font-semibold text-muted">Built on proven infrastructure</p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-lg font-extrabold tracking-tight text-slate-400">
              {["Vapi", "Twilio", "Dograh", "Supabase", "Vercel"].map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
        </section>

        {/* Services */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Heading center eyebrow="What we do" title="Three ways the agent grows your business" lead="Choose one to start with. They share the same knowledge, the same contacts and the same dashboard." />
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {SERVICES.map((s) => (
                <Link key={s.title} href={s.href} className="group rounded-2xl border border-blue-100 bg-white p-7 shadow-[0_1px_2px_rgb(15_42_107/0.04)] transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_48px_-24px_rgb(15_42_107/0.35)]">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white"><s.icon size={26} /></span>
                  <h3 className="mt-6 text-xl font-bold text-ink">{s.title}</h3>
                  <p className="mt-3 text-[0.95rem] leading-relaxed text-muted">{s.body}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary">Learn more <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* About split */}
        <section className="bg-[#f4f7fd] py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div className="relative order-2 lg:order-1">
              <div className="rounded-[1.6rem] border border-blue-100 bg-white p-6 shadow-[0_30px_60px_-36px_rgb(15_42_107/0.4)]">
                <p className="text-sm font-bold text-ink">Calls handled this week</p>
                <div className="mt-4 flex h-40 items-end gap-3" aria-hidden>
                  {[42, 58, 51, 70, 64, 78, 86].map((h, i) => (
                    <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-blue-700 to-sky-400" style={{ height: `${h}%` }} />
                      <span className="text-[0.68rem] font-bold text-muted">{["M", "T", "W", "T", "F", "S", "S"][i]}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-blue-50 pt-4 text-center">
                  {[["Answered", "Every call"], ["Follow-ups", "Tracked"], ["Bookings", "Confirmed"]].map(([k, v]) => (
                    <div key={k}><p className="text-sm font-extrabold text-ink">{v}</p><p className="text-[0.7rem] font-semibold text-muted">{k}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Heading eyebrow="Why MultiVoice" title="A calm, consistent voice for every customer" lead="Human teams get busy, tired and booked up. The agent gives the same accurate answer at 2 pm and at 2 am, and knows when to hand over to a person." />
              <ul className="mt-7 space-y-3.5">
                {[
                  "Answers only from your approved material, never invented prices",
                  "Books appointments and callbacks against real dates",
                  "Hands unanswered questions to your team with the caller’s exact words",
                  "Keeps going when one voice provider has an outage",
                  "Protected by two-factor sign-in, roles and an audit trail",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[0.98rem] text-ink-2"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-primary" /> {t}</li>
                ))}
              </ul>
              <Link href="/integrations" className="btn mt-8 h-12 rounded-xl px-6">How it works <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>

        {/* Facts band */}
        <section className="bg-navy py-16 text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 text-center sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {FACTS.map(([n, t]) => (
              <div key={t}>
                <p className="text-[2.8rem] font-extrabold leading-none tracking-[-0.03em] text-white">{n}</p>
                <p className="mt-3 text-sm text-white/70">{t}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Heading center eyebrow="How it works" title="From sign-up to first call in four steps" />
            <ol className="relative mt-14 grid gap-8 md:grid-cols-4">
              <span aria-hidden className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-blue-200 md:block" />
              {STEPS.map(([n, t, b]) => (
                <li key={n} className="relative text-center">
                  <span className="relative mx-auto grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-primary text-base font-extrabold text-white shadow-[0_10px_24px_-10px_rgb(37_99_235/0.9)]">{n}</span>
                  <h3 className="mt-5 text-lg font-bold text-ink">{t}</h3>
                  <p className="mx-auto mt-2 max-w-[15rem] text-sm leading-relaxed text-muted">{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Industries */}
        <section className="bg-[#f4f7fd] py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <Heading eyebrow="Industries" title="Made for businesses that live on the phone" />
              <Link href="/faq" className="btn btn-ghost">Common questions</Link>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {INDUSTRIES.map((i) => (
                <div key={i.name} className="flex gap-4 rounded-2xl border border-blue-100 bg-white p-6">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><i.icon size={22} /></span>
                  <div>
                    <h3 className="font-bold text-ink">{i.name}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{i.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 px-6 py-12 text-white sm:px-12">
              <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
              <div aria-hidden className="pointer-events-none absolute -bottom-32 right-40 h-72 w-72 rounded-full bg-white/10" />
              <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <Building2 className="text-white/80" />
                  <h2 className="mt-3 text-[1.8rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.2rem]">Ready to let the agent take tonight’s calls?</h2>
                  <p className="mt-3 text-white/85">Sign in, upload one document and hear your assistant answer from it in under ten minutes.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/login" className="btn btn-white h-12 rounded-xl px-7">Get started <ArrowRight size={17} /></Link>
                  <Link href="/integrations" className="btn h-12 rounded-xl border-white/40 bg-white/10 px-7 shadow-none">See the platform</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
