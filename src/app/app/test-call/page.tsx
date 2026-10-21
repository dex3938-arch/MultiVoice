import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { TEAM } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { Card, PageTitle } from "../_components/ui";
import { TestCall } from "./TestCall";

export const metadata: Metadata = { title: "Test call" };

export default async function TestCallPage() {
  const user = await requireUser(TEAM);
  const s = await getSettings();
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  return (
    <>
      <PageTitle eyebrow="Agent" title="Test call" sub="Talk to your assistant in the browser before it calls customers. It uses the same tools and knowledge as phone calls; results are saved as browser tests." />
      {publicKey && s.vapiAssistantId ? (
        <TestCall
          publicKey={publicKey}
          assistantId={s.vapiAssistantId}
          variables={{ businessName: s.businessName, agentName: s.agentName, customerName: user.name.split(" ")[0], company: "", city: "", notes: "Browser test call by staff." }}
        />
      ) : (
        <Card>
          <h2 className="font-bold">Almost there</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-2">
            {!publicKey && <li>Add <code>NEXT_PUBLIC_VAPI_PUBLIC_KEY</code> (Vapi → API Keys → Public) to the environment and redeploy.</li>}
            {!s.vapiAssistantId && <li>Put your Vapi assistant id in <Link href="/app/settings" className="font-semibold text-primary underline">Settings</Link>.</li>}
          </ul>
        </Card>
      )}
    </>
  );
}
