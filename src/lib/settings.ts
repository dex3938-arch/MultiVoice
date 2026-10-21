import "server-only";
import { cache } from "react";
import { prisma } from "./db";

/** Business details and calling rules (one row). Cached per request. */
export const getSettings = cache(() => prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }));

export type AppSettings = Awaited<ReturnType<typeof getSettings>>;

export const phoneNumberIds = (s: { vapiPhoneNumbers: string | null }) =>
  (s.vapiPhoneNumbers ?? "").split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
