import "server-only";
import { ProviderError, classifyFailure } from "./failover";

/**
 * Dograh (open-source voice agent platform, hosted at app.dograh.com or self-hosted): the second provider.
 * Outbound: POST {base}/api/v1/public/agent/workflow/{agentUuid} with X-API-Key.
 * Events come back through a Webhook node → /api/dograh/webhook, tools through HTTP API tools → /api/dograh/tools/<name>.
 */
export const dograhConfigured = () => Boolean(process.env.DOGRAH_API_KEY?.trim());

export async function createDograhCall(input: {
  baseUrl: string;
  agentUuid: string;
  phoneNumber: string;
  context: Record<string, string>;
  telephonyConfigId?: number | null;
  fromNumberId?: number | null;
}): Promise<{ id: string; status?: string }> {
  const key = process.env.DOGRAH_API_KEY?.trim();
  if (!key) throw new ProviderError("DOGRAH_API_KEY is not set on the server", "dograh", "auth");
  const base = input.baseUrl.replace(/\/$/, "");
  if (!/^https?:\/\//.test(base)) throw new ProviderError("Dograh base URL must start with https://", "dograh", "request");
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/public/agent/workflow/${encodeURIComponent(input.agentUuid)}`, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_number: input.phoneNumber,
        initial_context: input.context,
        ...(input.telephonyConfigId ? { telephony_configuration_id: input.telephonyConfigId } : {}),
        ...(input.fromNumberId ? { from_phone_number_id: input.fromNumberId } : {}),
      }),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
  } catch (e) {
    throw new ProviderError(`Dograh unreachable: ${e instanceof Error ? e.message : "network error"}`, "dograh", "down", 0);
  }
  const text = await res.text();
  let j: { workflow_run_id?: number | string; status?: string; detail?: unknown; message?: string } = {};
  try {
    j = JSON.parse(text);
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || j.workflow_run_id === undefined || j.workflow_run_id === null) {
    const detail = typeof j.detail === "string" ? j.detail : j.detail ? JSON.stringify(j.detail) : j.message ?? text.slice(0, 200);
    const msg = `Dograh ${res.status}: ${detail}`;
    throw new ProviderError(msg, "dograh", res.ok ? "request" : classifyFailure(res.status, detail), res.status);
  }
  return { id: `dograh:${j.workflow_run_id}`, status: "queued" };
}
