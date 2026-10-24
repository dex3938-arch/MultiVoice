import { BellRing, Clock3, MessageSquareQuote, MoonStar, UserCheck, UserRoundCog } from "lucide-react";
import { breadcrumb, pageMetadata } from "@/lib/seo";
import { Cta, FeatureGrid, JsonLd, PageHero, Prose, Related, Section, SiteFooter, SiteHeader } from "../_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("inbound");

export default function InboundPage() {
  return (
    <>
      <JsonLd data={breadcrumb("inbound")} />
      <SiteHeader current="inbound" />
      <main>
        <PageHero
          eyebrow="AI receptionist"
          title="A receptionist that never takes a lunch break"
          intro="Plenty of small-business calls arrive when nobody can pick up. MultiVoice answers each one on the first ring, handles the routine questions completely and passes the rest to your team with the details already written down."
        />

        <Section title="Where an AI receptionist pays off">
          <FeatureGrid
            items={[
              { icon: MoonStar, title: "After hours and weekends", body: "Evening enquiries become booked visits instead of unreturned voicemails." },
              { icon: BellRing, title: "Peak-time overflow", body: "When every line is busy, the agent takes the extra callers instead of a hold queue." },
              { icon: Clock3, title: "Repetitive questions", body: "Opening times, fees, directions and eligibility rules are answered the same way every time." },
            ]}
          />
        </Section>

        <Section title="What happens on an inbound call">
          <Prose>
            <h3>1. The greeting</h3>
            <p>The call reaches your Twilio number and is routed to the healthiest voice provider. The assistant introduces itself with your business name and asks how it can help.</p>
            <h3>2. The answer</h3>
            <p>For each question it looks up your knowledge base and replies in one or two sentences, starting with the answer rather than with filler. If the caller wants more, it continues; if not, it moves on.</p>
            <h3>3. The next step</h3>
            <p>It offers an appointment, a callback or a transfer, depending on what the caller wants, and confirms the time aloud before saving it.</p>
            <h3>4. The record</h3>
            <p>When the caller hangs up, the CRM receives the transcript, summary and recording. New callers are added as contacts automatically, without being enrolled in outbound campaigns unless they agree.</p>
          </Prose>
        </Section>

        <Section title="Knowing when to hand over" lead="A good receptionist knows its limits. The agent will not guess a price or promise a delivery date that is not in your documents.">
          <FeatureGrid
            items={[
              { icon: MessageSquareQuote, title: "Exact question captured", body: "The follow-up task contains the caller’s own wording, so staff can reply precisely." },
              { icon: UserRoundCog, title: "Assign and close", body: "Managers assign tasks, record what the customer was told and close them with one click." },
              { icon: UserCheck, title: "Teach it once", body: "Tick ‘teach the agent’ when closing a task and the answer joins the knowledge base for next time." },
            ]}
          />
        </Section>

        <Related keys={["features", "outbound", "faq"]} />
        <Cta title="Stop sending callers to voicemail" body="Connect your number and let the receptionist pick up tonight’s calls." />
      </main>
      <SiteFooter />
    </>
  );
}
