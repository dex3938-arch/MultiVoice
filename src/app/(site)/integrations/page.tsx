import { Cloud, Database, Mic, PhoneCall, Server, Shuffle } from "lucide-react";
import { breadcrumb, pageMetadata } from "@/lib/seo";
import { Cta, FeatureGrid, JsonLd, PageHero, Prose, Related, Section, SiteFooter, SiteHeader } from "../_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("integrations");

export default function IntegrationsPage() {
  return (
    <>
      <JsonLd data={breadcrumb("integrations")} />
      <SiteHeader current="integrations" />
      <main>
        <PageHero
          eyebrow="Integrations"
          title="The stack behind each call, and what happens when part of it fails"
          intro="MultiVoice does not lock you into one vendor. It sits between your phone number and two interchangeable voice platforms, and keeps the customer record in a database you own."
        />

        <Section title="Building blocks">
          <FeatureGrid
            items={[
              { icon: Mic, title: "Vapi (primary voice)", body: "Speech recognition, the language model and the synthetic voice, plus browser calls for testing. Tools call back into MultiVoice over signed webhooks." },
              { icon: Server, title: "Dograh (backup voice)", body: "An open-source voice agent platform, hosted or self-hosted, that can take inbound and outbound calls on the same Twilio number." },
              { icon: PhoneCall, title: "Twilio (phone numbers)", body: "Local and toll-free numbers in many countries; one setup command imports them and points them at the router." },
              { icon: Database, title: "Supabase (Postgres)", body: "Contacts, calls, transcripts and knowledge in your own database, locked with row-level security." },
              { icon: Cloud, title: "Vercel (hosting)", body: "The portal and the webhook endpoints, deployed close to your database for short response times." },
              { icon: Shuffle, title: "Failover router", body: "Decides per call which voice provider is healthy enough to handle it." },
            ]}
          />
        </Section>

        <Section title="How automatic failover works">
          <Prose>
            <h3>Outbound</h3>
            <p>The dialer tries providers in the order you set, Vapi then Dograh by default. If Vapi answers with a billing error, an authentication error, a rate limit or an outage, MultiVoice records why, gives Vapi a rest period and places the same call through Dograh within the same request. A problem with the destination number itself is not retried elsewhere, because it would fail there too.</p>
            <h3>Inbound</h3>
            <p>Your Twilio number sends each new call to the MultiVoice router, which checks Twilio’s signature and redirects the call to the first provider that is not resting. If a Vapi call ends because the account ran out of credit, Vapi is rested and the next caller reaches Dograh.</p>
            <h3>Rest periods</h3>
            <ul>
              <li>Out of credits: six hours, or until a manager presses ‘Use again’ after topping up.</li>
              <li>Rejected key: thirty minutes.</li>
              <li>Outage or timeout: five minutes.</li>
              <li>Rate limit: two minutes.</li>
            </ul>
            <p>The provider health card in Settings shows the last error, when it happened and when each provider last completed a call.</p>
          </Prose>
        </Section>

        <Section title="Same tools on both providers" lead="Both voice platforms call the same seven endpoints in MultiVoice, so a caller gets identical behaviour whichever one answers: knowledge search, contact details, booking, callbacks, follow-ups, Do-Not-Call and outcome recording.">
          <div className="glass rounded-3xl p-6 font-mono text-[0.8rem] leading-7 text-ink-2">
            <p>Vapi → /api/vapi/webhook (tool-calls, status, end-of-call report)</p>
            <p>Dograh → /api/dograh/tools/&lt;tool&gt; and /api/dograh/webhook</p>
            <p>Twilio → /api/twilio/voice (signed inbound router)</p>
          </div>
        </Section>

        <Related keys={["outbound", "security", "faq"]} />
        <Cta title="Keep calling when a vendor has a bad day" body="Add a second provider in Settings and test the switch with one click." />
      </main>
      <SiteFooter />
    </>
  );
}
