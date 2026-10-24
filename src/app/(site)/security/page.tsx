import { Database, Eye, FileLock2, KeyRound, ScrollText, ShieldAlert } from "lucide-react";
import { breadcrumb, pageMetadata } from "@/lib/seo";
import { Cta, FeatureGrid, JsonLd, PageHero, Prose, Related, Section, SiteFooter, SiteHeader } from "../_ui";

export const dynamic = "force-static";
export const metadata = pageMetadata("security");

export default function SecurityPage() {
  return (
    <>
      <JsonLd data={breadcrumb("security")} />
      <SiteHeader current="security" />
      <main>
        <PageHero
          eyebrow="Security"
          title="Customer conversations deserve bank-grade care"
          intro="Call recordings and contact lists are among the most sensitive data a company holds. These are the controls built into MultiVoice, from the sign-in screen down to the database rows."
        />

        <Section title="Protection layers">
          <FeatureGrid
            items={[
              { icon: KeyRound, title: "Mandatory two-factor sign-in", body: "Every account needs an authenticator app code after the password, with one-time recovery codes and replay protection." },
              { icon: Eye, title: "Least-privilege roles", body: "Viewers read, agents work leads, managers change settings, and only super admins manage people." },
              { icon: ScrollText, title: "Audit trail", body: "Sign-ins, failed attempts, imports, settings changes, provider switches and deletions are logged with time and source address." },
              { icon: FileLock2, title: "Signed machine traffic", body: "Voice platforms must present a shared secret, and Twilio requests are checked against Twilio’s signature." },
              { icon: Database, title: "Locked database", body: "Row-level security on every table blocks the public database API; the app connects as the owner only from the server." },
              { icon: ShieldAlert, title: "Abuse throttling", body: "Repeated wrong passwords, codes or webhook secrets slow down and then block the source." },
            ]}
          />
        </Section>

        <Section title="In the browser and on the server">
          <Prose>
            <p>Sessions live in HttpOnly, Secure, SameSite=Strict cookies with a host-only prefix, so scripts cannot read them and other sites cannot send them. Changing a password, resetting two-factor or deactivating a user signs that person out everywhere at once.</p>
            <p>A strict Content Security Policy allows scripts only from the application itself; the voice SDK’s domains are allowed on the single page that needs a microphone. Pages refuse to be framed, private screens are never cached, and the portal is hidden from search engines.</p>
            <p>Data travels over TLS between callers’ providers, the app and the database; the managed Postgres service encrypts it at rest, and authenticator secrets are encrypted again by the app with a key only the server holds.</p>
            <p>API keys for the voice providers and the database exist only as server environment variables. The browser never receives them, and the application’s source maps are not published.</p>
            <h3>Calling compliance</h3>
            <p>Automatic calls need recorded consent, stay inside your calling hours and skip numbers on the Do-Not-Call list. Callers who opt out on a call are blocked from every future campaign without anyone having to update a spreadsheet.</p>
            <h3>Your responsibilities</h3>
            <ul>
              <li>Keep the environment file private and rotate any key that was shared.</li>
              <li>Use a private code repository and limit who can access hosting dashboards.</li>
              <li>Tell callers that calls are recorded where local law requires it.</li>
            </ul>
          </Prose>
        </Section>

        <Related keys={["integrations", "faq", "features"]} />
        <Cta title="Security that does not slow your team down" body="Two-factor setup takes a minute, and everything else is on by default." />
      </main>
      <SiteFooter />
    </>
  );
}
