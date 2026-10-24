import { AudioLines, BookOpen, CalendarCheck, ClipboardList, Clock, FileSearch, Gauge, Languages, ListChecks, PhoneForwarded, Tags, Users } from "lucide-react";
import { breadcrumb, pageMetadata } from "@/lib/seo";
import { Cta, FeatureGrid, JsonLd, PageHero, Prose, Related, Section, SiteFooter, SiteHeader } from "../_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("features");

export default function FeaturesPage() {
  return (
    <>
      <JsonLd data={breadcrumb("features")} />
      <SiteHeader current="features" />
      <main>
        <PageHero
          eyebrow="Features"
          title="Everything the voice agent does, and everything it records"
          intro="MultiVoice is two products in one: a conversational phone agent and the CRM that remembers what it heard. This page walks through each capability, what it is for and where you will find the result in the portal."
        />

        <Section title="Answers that come from your documents" lead="The agent does not rely on a general chatbot’s memory for facts about your business. Before it replies, it searches the material you uploaded and speaks from the best passage.">
          <FeatureGrid
            items={[
              { icon: BookOpen, title: "Any document size", body: "PDF handbooks with hundreds of pages, Word files, CSV price lists, JSON catalogues, Markdown FAQs or pasted text." },
              { icon: FileSearch, title: "Clean reading", body: "Running headers, page numbers and broken line wraps are removed, and bold questions become searchable topics." },
              { icon: ListChecks, title: "Test before callers do", body: "Type a question in the portal and see the exact passage, match score and lookup time the agent would get." },
            ]}
          />
        </Section>

        <Section title="Actions the agent takes during a call">
          <FeatureGrid
            cols={4}
            items={[
              { icon: CalendarCheck, title: "Book appointments", body: "Agrees a date and time, refuses past or far-future slots, and never double-books the same call." },
              { icon: Clock, title: "Schedule callbacks", body: "A request like ‘ring me after lunch tomorrow’ becomes a timed callback for the dialer." },
              { icon: ClipboardList, title: "Create follow-ups", body: "Anything it cannot answer is handed to a person with the caller’s exact words and a due time." },
              { icon: PhoneForwarded, title: "Transfer to a human", body: "Optional live transfer to a sales or support number when the caller asks for one." },
            ]}
          />
        </Section>

        <Section title="The CRM behind the calls">
          <Prose>
            <p>Every caller becomes a <strong>contact</strong> with status, tags, company, city, consent date and notes. The agent fills these in while it talks, for example after a caller spells out an email address. Staff can edit, import CSV files of up to five thousand rows, or remove a contact entirely.</p>
            <p>Each <strong>call</strong> keeps its transcript as a chat view, the audio recording, an AI summary, the outcome, the duration and the provider cost. Calls still in progress refresh every few seconds, so a supervisor can watch the result arrive.</p>
            <h3>Outcomes that mean something</h3>
            <p>Results are ranked so the most important one wins: a booked appointment outweighs a mere ‘interested’, while a final ‘not interested’ cancels an earlier callback request. Contact status follows the outcome but never downgrades a won deal or a Do-Not-Call flag.</p>
            <h3>Dashboard</h3>
            <p>Today’s calls, answered share, upcoming appointments, overdue follow-ups, a seven-day chart and month-to-date spend against your budget. Browser test calls are excluded so the figures reflect real customers.</p>
          </Prose>
        </Section>

        <Section title="Small details that save hours">
          <FeatureGrid
            cols={4}
            items={[
              { icon: Languages, title: "Language switching", body: "The assistant follows the caller if they move between languages mid-conversation." },
              { icon: Tags, title: "Tags and filters", body: "Segment contacts by campaign, source or interest and filter every list in one click." },
              { icon: AudioLines, title: "Browser test calls", body: "Talk to your assistant from a laptop microphone without using a phone number." },
              { icon: Gauge, title: "Fast on phones", body: "Static marketing pages, instant loading states and a bottom tab bar for staff on mobile." },
              { icon: Users, title: "Four roles", body: "Super admin, manager, agent and viewer, each seeing only the screens they need." },
            ]}
          />
        </Section>

        <Related keys={["inbound", "outbound", "integrations"]} />
        <Cta title="See the features with your own data" body="Upload a document, ask it a question in the knowledge tester and place a browser test call." />
      </main>
      <SiteFooter />
    </>
  );
}
