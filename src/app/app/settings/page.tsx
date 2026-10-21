import type { Metadata } from "next";
import { Bot, Clock, KeyRound, Link2 } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { MANAGERS } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { siteUrl } from "@/lib/site";
import { vapiConfigured } from "@/lib/vapi";
import { ActionForm } from "../_components/ActionForm";
import { Badge, Card, CardHeader, PageTitle } from "../_components/ui";
import { saveSettings } from "../actions";

export const metadata: Metadata = { title: "Settings" };

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="text-sm font-semibold">{label}</span>
    <span className="mt-1.5 block">{children}</span>
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
);

export default async function SettingsPage() {
  await requireUser(MANAGERS);
  const s = await getSettings();
  const app = siteUrl();
  const keys: [string, boolean][] = [
    ["VAPI_API_KEY (server)", vapiConfigured()],
    ["VAPI_WEBHOOK_SECRET", (process.env.VAPI_WEBHOOK_SECRET?.trim().length ?? 0) >= 24],
    ["NEXT_PUBLIC_VAPI_PUBLIC_KEY (browser test)", Boolean(process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY)],
    ["CRON_SECRET", (process.env.CRON_SECRET?.trim().length ?? 0) >= 16],
  ];
  return (
    <>
      <PageTitle eyebrow="Admin" title="Settings" sub="Business details and calling rules. API keys are never stored here; they live only in the server environment (Vercel → Settings → Environment Variables)." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <ActionForm action={saveSettings} submit="Save settings">
            <CardHeader title="Agent" icon={Bot} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" hint="Sent to the assistant as {{businessName}}"><input name="businessName" defaultValue={s.businessName} required className="input" /></Field>
              <Field label="Agent name" hint="{{agentName}}"><input name="agentName" defaultValue={s.agentName} required className="input" /></Field>
              <Field label="Vapi assistant id" hint="Vapi → Assistants → copy the ID"><input name="vapiAssistantId" defaultValue={s.vapiAssistantId ?? ""} className="input font-mono text-[0.8rem]" /></Field>
              <Field label="Vapi phone number ids" hint="Vapi → Phone Numbers (your Twilio numbers). Several = comma separated, calls take turns."><input name="vapiPhoneNumbers" defaultValue={s.vapiPhoneNumbers ?? ""} className="input font-mono text-[0.8rem]" /></Field>
              <Field label="Default country code" hint="For numbers typed without +"><input name="defaultCountry" defaultValue={s.defaultCountry} className="input" /></Field>
              <Field label="Time zone" hint="IANA name, e.g. Asia/Kolkata, America/New_York"><input name="timezone" defaultValue={s.timezone} className="input" /></Field>
              <Field label="Follow-up promise (hours)" hint="“Our team will get back to you within … hours”"><input name="followUpHours" type="number" min={1} max={168} defaultValue={s.followUpHours} className="input" /></Field>
            </div>
            <div className="mt-6"><CardHeader title="Outbound calling rules" icon={Clock} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Calling hours start"><input name="callingStart" type="time" defaultValue={s.callingStart} className="input" /></Field>
              <Field label="Calling hours end"><input name="callingEnd" type="time" defaultValue={s.callingEnd} className="input" /></Field>
              <Field label="Max attempts per contact"><input name="maxAttempts" type="number" min={1} max={10} defaultValue={s.maxAttempts} className="input" /></Field>
              <Field label="Retry gap (minutes)" hint="After no answer / busy / voicemail"><input name="retryGapMinutes" type="number" min={15} defaultValue={s.retryGapMinutes} className="input" /></Field>
              <Field label="Calls at the same time" hint="Your Vapi concurrency limit"><input name="maxConcurrent" type="number" min={1} max={50} defaultValue={s.maxConcurrent} className="input" /></Field>
              <Field label="Monthly budget (USD)" hint="Vapi cost; dialer pauses at this"><input name="monthlyBudgetUsd" type="number" min={0} defaultValue={s.monthlyBudgetUsd} className="input" /></Field>
            </div>
            <label className="mt-4 flex items-start gap-2 text-sm font-semibold"><input type="checkbox" name="outboundEnabled" defaultChecked={s.outboundEnabled} className="mt-0.5" /> Automatic outbound calling is on</label>
          </ActionForm>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader title="Server keys" sub="Set in Vercel, shown here only as on/off" icon={KeyRound} />
            <ul className="space-y-2 text-sm">
              {keys.map(([k, on]) => <li key={k} className="flex items-center justify-between gap-2"><span className="font-mono text-[0.75rem]">{k}</span>{on ? <Badge tone="green" dot>set</Badge> : <Badge tone="red" dot>missing</Badge>}</li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Vapi connection" icon={Link2} />
            <p className="text-sm text-muted">In Vapi set the <b>Server URL</b> (assistant and phone numbers) to:</p>
            <p className="soft mt-2 break-all rounded-xl px-3 py-2 font-mono text-[0.78rem] font-semibold">{app}/api/vapi/webhook</p>
            <p className="mt-2 text-xs text-muted">with a Bearer Token credential equal to VAPI_WEBHOOK_SECRET. Full steps: docs/VAPI-SETUP.md.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
