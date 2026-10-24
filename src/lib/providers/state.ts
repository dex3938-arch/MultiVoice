import "server-only";
import { prisma } from "../db";
import { getSettings } from "../settings";
import { vapiConfigured } from "../vapi";
import { dograhConfigured } from "./dograh";
import { PROVIDERS, REST_MINUTES, parseOrder, usableProviders, type FailureKind, type ProviderHealth, type ProviderId } from "./failover";

/** Is the provider set up (keys in the environment + ids in Settings)? */
export async function providerSetup(): Promise<Record<ProviderId, { configured: boolean; missing: string[] }>> {
  const s = await getSettings();
  const vapiMissing = [
    ...(vapiConfigured() ? [] : ["VAPI_API_KEY"]),
    ...(s.vapiAssistantId ? [] : ["assistant id"]),
    ...(s.vapiPhoneNumbers ? [] : ["phone number id"]),
  ];
  const dograhMissing = [...(dograhConfigured() ? [] : ["DOGRAH_API_KEY"]), ...(s.dograhAgentUuid ? [] : ["agent UUID"])];
  return {
    vapi: { configured: vapiMissing.length === 0, missing: vapiMissing },
    dograh: { configured: dograhMissing.length === 0, missing: dograhMissing },
  };
}

export async function providerStates() {
  const rows = await prisma.providerState.findMany();
  return Object.fromEntries(PROVIDERS.map((p) => [p, rows.find((r) => r.id === p) ?? null])) as Record<ProviderId, (typeof rows)[number] | null>;
}

export async function providerHealth(): Promise<Record<ProviderId, ProviderHealth>> {
  const [setup, states] = await Promise.all([providerSetup(), providerStates()]);
  return Object.fromEntries(PROVIDERS.map((p) => [p, { configured: setup[p].configured, restingUntil: states[p]?.cooldownUntil ?? null }])) as Record<ProviderId, ProviderHealth>;
}

/** Providers to use right now, in the order from Settings. */
export async function activeProviders(now = new Date()) {
  const s = await getSettings();
  return usableProviders(parseOrder(s.providerOrder), await providerHealth(), now);
}

export async function recordFailure(provider: ProviderId, kind: FailureKind, message: string) {
  const rest = REST_MINUTES[kind];
  const data = {
    lastError: message.slice(0, 300),
    lastErrorKind: kind,
    lastErrorAt: new Date(),
    ...(rest ? { cooldownUntil: new Date(Date.now() + rest * 60_000) } : {}),
  };
  await prisma.providerState.upsert({ where: { id: provider }, update: { ...data, failures: { increment: 1 } }, create: { id: provider, ...data, failures: 1 } });
  if (rest) await prisma.auditLog.create({ data: { action: "provider.rest", entity: "Provider", entityId: provider, detail: { kind, minutes: rest, message: message.slice(0, 200) } } });
}

export async function recordSuccess(provider: ProviderId) {
  await prisma.providerState.upsert({ where: { id: provider }, update: { lastOkAt: new Date(), cooldownUntil: null, failures: 0 }, create: { id: provider, lastOkAt: new Date() } });
}

/** Manager pressed "Use again" in Settings. */
export async function clearRest(provider: ProviderId) {
  await prisma.providerState.upsert({ where: { id: provider }, update: { cooldownUntil: null }, create: { id: provider } });
}
