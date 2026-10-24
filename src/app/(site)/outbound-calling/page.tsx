import { Ban, CalendarClock, CircleDollarSign, ListRestart, Phone, ShieldCheck } from "lucide-react";
import { breadcrumb, pageMetadata } from "@/lib/seo";
import { Cta, FeatureGrid, JsonLd, PageHero, Prose, Related, Section, SiteFooter, SiteHeader } from "../_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("outbound");

export default function OutboundPage() {
  return (
    <>
      <JsonLd data={breadcrumb("outbound")} />
      <SiteHeader current="outbound" />
      <main>
        <PageHero
          eyebrow="Outbound campaigns"
          title="Work through a contact list without a call centre"
          intro="Lead lists go cold within days. The MultiVoice dialer calls each consented contact at a reasonable hour, has a natural first conversation and leaves your sales team only the people who want to talk."
        />

        <Section title="Rules the dialer follows on every round">
          <FeatureGrid
            items={[
              { icon: ShieldCheck, title: "Consent first", body: "Only contacts with a recorded consent date are called automatically; a requested callback counts as permission for that call." },
              { icon: Ban, title: "Do-Not-Call honoured", body: "A spoken ‘don’t call me again’ adds the number to the blocklist immediately, across all campaigns." },
              { icon: CalendarClock, title: "Local calling hours", body: "A calling window in your own time zone, including windows that run past midnight." },
              { icon: ListRestart, title: "Sensible retries", body: "No-answer, busy and voicemail results are retried after a gap you choose, up to a maximum number of attempts." },
              { icon: Phone, title: "Line limits", body: "Never more simultaneous calls than your plan allows; several caller IDs are used in turn." },
              { icon: CircleDollarSign, title: "Budget cap", body: "Dialing pauses automatically when the month’s provider spend reaches your limit." },
            ]}
          />
        </Section>

        <Section title="Three ways to run the dialer">
          <Prose>
            <p><strong>Scheduled.</strong> A cron job calls the dialer endpoint with a secret. On Vercel’s paid plan it can run every minute; on the free plan you can use any external scheduler.</p>
            <p><strong>Live dialing.</strong> Keep the campaign page open and press start: the portal triggers a round every 25 seconds and shows each result as it lands.</p>
            <p><strong>One contact now.</strong> The ‘Call now’ button on a contact places a single call immediately, still respecting the Do-Not-Call list.</p>
            <h3>What a conversation looks like</h3>
            <p>The assistant greets the contact by name, checks whether it is a good moment, and either continues, offers a later slot or ends politely. Callers who never speak are treated as unreached and retried; those who decline are not called again.</p>
            <h3>If a provider fails mid-campaign</h3>
            <p>When the primary voice service rejects a call because credits ran out or its key stopped working, the same contact is passed to the backup provider straight away and the contact keeps its attempt. Details are on the integrations page.</p>
          </Prose>
        </Section>

        <Related keys={["integrations", "security", "features"]} />
        <Cta title="Turn your lead list into conversations" body="Import a CSV, set your calling hours and press start." />
      </main>
      <SiteFooter />
    </>
  );
}
