import { breadcrumb, pageMetadata } from "@/lib/seo";
import { Cta, JsonLd, PageHero, Related, SiteFooter, SiteHeader } from "../_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("faq");

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Getting started",
    items: [
      ["How long does setup take?", "Most teams are taking calls the same afternoon: create the accounts, paste the keys into the environment, run the setup command and upload a first document."],
      ["Do I need my own phone number?", "Yes, a Twilio voice number is recommended. Free numbers from Vapi are limited to US area codes and only accept incoming calls, so they cannot run outbound campaigns."],
      ["Can I try it without a phone?", "Yes. The portal has a browser test call that uses your laptop microphone and saves the conversation like a real call, marked as a test."],
    ],
  },
  {
    title: "Costs",
    items: [
      ["What does a call cost?", "You pay the voice platform per minute plus Twilio’s per-minute and number rental charges. The portal shows the provider cost of every call and the month’s total against your budget."],
      ["Is there a free tier?", "Vapi has offered new accounts a one-time trial credit, and Dograh can be self-hosted without a platform fee. Check each provider’s pricing page, because offers change."],
    ],
  },
  {
    title: "Knowledge and answers",
    items: [
      ["How large can uploaded documents be?", "Large PDFs are read page by page in your browser and only the text is sent, so manuals with hundreds of pages work. Scanned images without selectable text cannot be read."],
      ["What if the answer is not in my documents?", "For questions about your business the agent says the team will confirm and creates a follow-up; it does not invent prices or policies. Simple general-knowledge questions get a short factual reply."],
      ["Which languages are supported?", "That depends on the transcriber and voice you choose in the provider. The assistant is instructed to follow the caller’s language when they switch."],
    ],
  },
  {
    title: "Reliability and limits",
    items: [
      ["How many calls can run at once?", "As many as your provider plan allows; you set the same number in Settings so the dialer never exceeds it."],
      ["What happens if a provider runs out of credit?", "New calls move to the backup provider automatically, the failure is shown in Settings, and the main provider is used again after its rest period or when you press ‘Use again’."],
      ["Will customers be called at night?", "No. The dialer only works inside the calling window you set, in your business time zone."],
    ],
  },
];

export default function FaqPage() {
  const all = GROUPS.flatMap((g) => g.items);
  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: all.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
          breadcrumb("faq"),
        ]}
      />
      <SiteHeader current="faq" />
      <main>
        <PageHero eyebrow="FAQ" title="Questions people ask before switching on an AI phone agent" intro="Short, practical answers about setup, money, knowledge, reliability and compliance. Anything missing? Sign in and ask your account admin." />
        <div className="mx-auto max-w-4xl space-y-8 px-4 pb-6 sm:px-6">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="text-xl font-extrabold tracking-[-0.02em]">{g.title}</h2>
              <div className="mt-3 space-y-3">
                {g.items.map(([q, a]) => (
                  <details key={q} className="glass group rounded-2xl px-5 py-4">
                    <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold">{q}<span className="text-xl text-primary transition-transform group-open:rotate-45">+</span></summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
        <Related keys={["inbound", "outbound", "integrations"]} />
        <Cta title="Still deciding?" body="Place a browser test call and judge the voice and the answers yourself." />
      </main>
      <SiteFooter />
    </>
  );
}
