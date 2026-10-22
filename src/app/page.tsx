import Link from "next/link";
import {
  ArrowRight, BookOpen, CalendarCheck, Check, Clock, Globe2, LineChart, Lock, Megaphone, MessageSquareText, PhoneIncoming, PhoneOutgoing,
  ShieldCheck, Smartphone, Sparkles, Users,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";

/** Public landing page: static, no database, indexed by search engines. */
export const dynamic = "force-static";

const FEATURES = [
  { icon: PhoneIncoming, title: "Answers every inbound call", body: "24/7, in a natural voice. Callers get answers from your own documents, not guesses." },
  { icon: PhoneOutgoing, title: "Runs outbound campaigns", body: "Calls your consented contacts inside calling hours, retries no-answers and honours Do-Not-Call." },
  { icon: CalendarCheck, title: "Books appointments", body: "Checks the date, confirms the time and puts it on your team's appointment board." },
  { icon: Clock, title: "Schedules callbacks", body: "“Call me tomorrow at 5” becomes a callback the dialer makes on time." },
  { icon: BookOpen, title: "Knowledge base", body: "Upload FAQs, price lists and policies as PDF, Word or text. Calls use them within a minute." },
  { icon: MessageSquareText, title: "Transcripts & summaries", body: "Every call saved with transcript, recording, summary, outcome and cost." },
  { icon: Users, title: "Built-in CRM", body: "Contacts, statuses, tags, follow-ups and appointments, all updated by the agent during the call." },
  { icon: LineChart, title: "Live dashboard", body: "Calls, pick-up rate, results and spend, refreshing by themselves." },
];

const STEPS = [
  { n: "1", title: "Connect", body: "Add your Vapi and Twilio keys and run one setup command: tools, assistant and number are connected for you." },
  { n: "2", title: "Teach", body: "Upload your FAQ and documents. The agent answers only from them." },
  { n: "3", title: "Call", body: "Inbound calls are answered at once; switch on the dialer for outbound." },
];

const FAQ = [
  { q: "What does MultiVoice Calling Agent do?", a: "It is an AI voice agent that answers inbound phone calls and makes outbound calls for your business. It answers questions from your documents, books appointments, schedules callbacks, and records everything in a built-in CRM." },
  { q: "Which services does it use?", a: "Vapi runs the voice conversation, Twilio provides the phone numbers, Supabase stores the data and Vercel hosts the portal." },
  { q: "Can it call many people at once?", a: "Yes. You choose how many calls run at the same time, the calling hours, the retry rules and a monthly budget. It only calls contacts who gave consent and never calls numbers on the Do-Not-Call list." },
  { q: "Is our data secure?", a: "Sign-in needs a password plus an authenticator code (MFA). Roles limit what each person can do, every sensitive action is logged, API keys stay on the server, and webhooks are verified with a secret." },
  { q: "Does it work on phones?", a: "Yes. The portal is fully responsive, so your team can check calls, follow-ups and appointments from any phone." },
];

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "SoftwareApplication", name: "MultiVoice Calling Agent", applicationCategory: "BusinessApplication", operatingSystem: "Web", description: "AI voice agent for inbound and outbound phone calls with a built-in CRM." },
      { "@type": "FAQPage", mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="MultiVoice home"><Logo /></Link>
          <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-semibold text-ink-2 md:flex">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#how" className="hover:text-primary">How it works</a>
            <a href="#security" className="hover:text-primary">Security</a>
            <a href="#faq" className="hover:text-primary">FAQ</a>
          </nav>
          <Link href="/login" className="btn btn-sm sm:h-10 sm:px-4">Sign in <ArrowRight size={15} /></Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-blue-100"><Sparkles size={14} /> AI voice agent · inbound & outbound</p>
            <h1 className="mt-5 text-[2.3rem] font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-[3.6rem]">
              Every call answered.<br /><span className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 bg-clip-text text-transparent">Every lead followed up.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              MultiVoice is an AI calling agent that talks to your customers like your best team member: it answers questions, books appointments, schedules callbacks and logs everything in its own CRM.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="btn h-12 rounded-2xl px-6 text-base">Open the portal <ArrowRight size={18} /></Link>
              <a href="#how" className="btn btn-ghost h-12 rounded-2xl px-6 text-base">How it works</a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-ink-2">
              {["Vapi voice AI", "Twilio numbers", "Supabase data", "Vercel hosting"].map((t) => <li key={t} className="flex items-center gap-1.5"><Check size={16} className="text-primary" /> {t}</li>)}
            </ul>
          </div>

          {/* Product preview */}
          <div className="relative">
            <div aria-hidden className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-sky-300/40 to-blue-500/30 blur-3xl" />
            <div className="glass-strong relative rounded-[2rem] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold"><LogoMark size={28} /> Live call</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/15"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> 01:42</span>
              </div>
              <ol className="mt-5 space-y-2.5 text-sm">
                <li className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 ring-1 ring-blue-100">Hi, this is Ava from Bright Dental. How can I help today?</li>
                <li className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-blue-600 to-sky-500 px-4 py-2.5 text-white">Do you have anything Thursday evening for a check-up?</li>
                <li className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-4 py-2.5 ring-1 ring-blue-100">Thursday at 5:30 pm works. Shall I book it for you?</li>
              </ol>
              <div className="mt-5 grid grid-cols-3 gap-2.5">
                {[["Calls today", "128"], ["Answered", "92%"], ["Booked", "17"]].map(([k, v]) => (
                  <div key={k} className="soft rounded-2xl px-3 py-3 text-center"><p className="digits text-xl">{v}</p><p className="text-[0.7rem] font-semibold text-muted">{k}</p></div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50/90 px-3 py-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-600/15"><CalendarCheck size={15} /> Appointment booked · Thu 5:30 pm</div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <p className="eyebrow text-primary">Features</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">An AI phone team and a CRM in one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <article key={f.title} className="glass card-hover rounded-3xl p-5">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_10px_20px_-10px_rgb(37_99_235/0.8)]"><f.icon size={20} /></span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="glass-blue relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <p className="eyebrow text-white/75">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Live in an afternoon</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-3xl bg-white/12 p-5 ring-1 ring-white/25 backdrop-blur">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg font-extrabold text-primary">{s.n}</span>
                  <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/85">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="security" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-primary">Security</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Built to protect customer data</h2>
            <p className="mt-3 text-muted">Your contacts and call recordings are business-critical. MultiVoice treats them that way.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              [Lock, "Two-factor sign-in", "Password + authenticator app for every user, with recovery codes."],
              [ShieldCheck, "Roles & audit log", "Admin, manager, agent and viewer. Sensitive actions are logged."],
              [Globe2, "Verified webhooks", "Vapi events need a secret; keys never reach the browser."],
              [Megaphone, "Consent & Do-Not-Call", "Automatic calls only to consented contacts, never to DNC numbers."],
              [Smartphone, "Works on any phone", "Responsive portal, fast pages, installable feel."],
              [Clock, "Calling-hour rules", "Time-zone aware windows, retry gaps and a monthly budget cap."],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof Lock;
              return (
                <li key={t as string} className="glass rounded-2xl p-4">
                  <p className="flex items-center gap-2 font-bold"><I size={17} className="text-primary" /> {t as string}</p>
                  <p className="mt-1 text-sm text-muted">{b as string}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
          <p className="eyebrow text-center text-primary">FAQ</p>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">Questions, answered</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="glass group rounded-2xl px-5 py-4">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold">{f.q}<span className="text-xl text-primary transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="glass-strong flex flex-col items-center gap-4 rounded-[2rem] px-6 py-10 text-center">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Ready to let the agent pick up?</h2>
            <p className="max-w-lg text-muted">Sign in to connect Vapi, upload your knowledge and make your first test call from the browser.</p>
            <Link href="/login" className="btn h-12 rounded-2xl px-7 text-base">Open the portal <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/60 bg-white/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} MultiVoice Calling Agent</p>
        </div>
      </footer>
    </>
  );
}
