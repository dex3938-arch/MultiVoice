"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guard";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/session";
import { decryptSecret, hashRecovery, newRecoveryCodes, verifyCode } from "@/lib/auth/totp";
import { prisma } from "@/lib/db";
import { dialContact, runDialer } from "@/lib/dialer";
import { ingestFile, ingestText, invalidateKnowledge } from "@/lib/knowledge/search";
import { parseCsv } from "@/lib/knowledge/loaders";
import { toE164 } from "@/lib/phone";
import { ADMINS, MANAGERS, ROLES, TEAM, type RoleValue } from "@/lib/roles";
import { getSettings } from "@/lib/settings";

export type ActionState = { ok?: string; error?: string; at?: number } | undefined;

const ok = (msg: string): ActionState => ({ ok: msg, at: Date.now() });
const fail = (msg: string): ActionState => ({ error: msg, at: Date.now() });
const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
const num = (fd: FormData, k: string) => Number(str(fd, k));
const tags = (s: string) => [...new Set(s.split(",").map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean))].slice(0, 10);

// --- Contacts ---------------------------------------------------------------------

const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "APPOINTMENT", "WON", "LOST", "DNC"] as const;
const email = z.string().email().max(160);

export async function addContact(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(TEAM);
  const s = await getSettings();
  const phone = toE164(str(fd, "phone", 30), s.defaultCountry);
  if (!phone) return fail("Enter a valid phone number (with country code, e.g. +14155550123).");
  const mail = str(fd, "email", 160);
  if (mail && !email.safeParse(mail).success) return fail("That email address does not look right.");
  if (await prisma.contact.findUnique({ where: { phone } })) return fail("A contact with this number already exists.");
  const c = await prisma.contact.create({
    data: {
      phone,
      name: str(fd, "name", 120) || null,
      email: mail || null,
      company: str(fd, "company", 120) || null,
      city: str(fd, "city", 80) || null,
      tags: tags(str(fd, "tags")),
      source: "manual",
      ownerId: user.id,
      consentAt: fd.get("consent") === "on" ? new Date() : null,
    },
  });
  await audit(user.id, "contact.create", "Contact", c.id);
  revalidatePath("/app/contacts");
  return ok("Contact added.");
}

/** CSV with a header row: name, phone, email, company, city, tags, consent (yes/no). */
export async function importContacts(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(TEAM);
  const s = await getSettings();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a CSV file.");
  if (file.size > 2_000_000) return fail("CSV is too large (max 2 MB).");
  const rows = parseCsv((await file.text()).replace(/^﻿/, "")).filter((r) => r.some((c) => c.trim()));
  if (rows.length < 2) return fail("The CSV needs a header row and at least one contact.");
  const head = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (row: string[], name: string) => (row[head.indexOf(name)] ?? "").trim();
  if (!head.includes("phone")) return fail('The header row must include a "phone" column.');
  const MAX_ROWS = 5000;
  const truncated = Math.max(0, rows.length - 1 - MAX_ROWS);
  const seen = new Set<string>();
  const data: Prisma.ContactCreateManyInput[] = [];
  let skipped = 0;
  for (const row of rows.slice(1, MAX_ROWS + 1)) {
    const phone = toE164(col(row, "phone"), s.defaultCountry);
    if (!phone || seen.has(phone)) {
      skipped++;
      continue;
    }
    seen.add(phone);
    const mail = col(row, "email").slice(0, 160);
    data.push({
      phone,
      name: col(row, "name").slice(0, 120) || null,
      email: mail && email.safeParse(mail).success ? mail : null,
      company: col(row, "company").slice(0, 120) || null,
      city: col(row, "city").slice(0, 80) || null,
      tags: tags(col(row, "tags").replace(/;/g, ",")),
      source: "csv",
      ownerId: user.id,
      consentAt: /^(y|yes|true|1)$/i.test(col(row, "consent")) ? new Date() : null,
    });
  }
  let added = 0;
  for (let i = 0; i < data.length; i += 500) added += (await prisma.contact.createMany({ data: data.slice(i, i + 500), skipDuplicates: true })).count;
  skipped += data.length - added;
  await audit(user.id, "contact.import", "Contact", undefined, { added, skipped, truncated });
  revalidatePath("/app/contacts");
  return ok(`Imported ${added} contact${added === 1 ? "" : "s"}${skipped ? `, skipped ${skipped} (duplicate or invalid number)` : ""}${truncated ? `; ${truncated} row(s) after the first 5000 were NOT imported, split the file` : ""}.`);
}

export async function updateContact(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(TEAM);
  const id = num(fd, "id");
  const status = STATUSES.find((x) => x === str(fd, "status"));
  if (!status) return fail("Choose a valid status.");
  const mail = str(fd, "email", 160);
  if (mail && !email.safeParse(mail).success) return fail("That email address does not look right.");
  const before = await prisma.contact.findUnique({ where: { id } });
  if (!before) return fail("Contact not found.");
  const consent = fd.get("consent") === "on";
  const c = await prisma.contact.update({
    where: { id },
    data: {
      status,
      name: str(fd, "name", 120) || null,
      email: mail || null,
      company: str(fd, "company", 120) || null,
      city: str(fd, "city", 80) || null,
      tags: tags(str(fd, "tags")),
      notes: str(fd, "notes", 5000) || null,
      consentAt: consent ? before.consentAt ?? new Date() : null,
      ...(status === "DNC" ? { nextCallAt: null } : {}),
    },
  });
  if (status === "DNC") await prisma.doNotCall.upsert({ where: { phone: c.phone }, update: {}, create: { phone: c.phone, reason: "marked by staff" } });
  else if (before.status === "DNC" && MANAGERS.includes(user.role)) await prisma.doNotCall.deleteMany({ where: { phone: c.phone } });
  await audit(user.id, "contact.update", "Contact", id, { status });
  revalidatePath(`/app/contacts/${id}`);
  revalidatePath("/app/contacts");
  return ok("Saved.");
}

export async function deleteContact(fd: FormData) {
  const user = await requireUser(MANAGERS);
  const id = num(fd, "id");
  await prisma.contact.delete({ where: { id } });
  await audit(user.id, "contact.delete", "Contact", id);
  revalidatePath("/app/contacts");
  redirect("/app/contacts");
}

/** "Call now": dials this contact straight away through Vapi (Do-Not-Call still applies). */
export async function callNow(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(TEAM);
  const id = num(fd, "id");
  try {
    await dialContact(id, { manual: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not start the call.");
  }
  await audit(user.id, "contact.call_now", "Contact", id);
  revalidatePath("/app/calls");
  revalidatePath(`/app/contacts/${id}`);
  return ok("Calling… the phone rings in a few seconds.");
}

// --- Campaign / dialer --------------------------------------------------------------

export async function runDialerNow(): Promise<ActionState> {
  const user = await requireUser(MANAGERS);
  const r = await runDialer();
  await audit(user.id, "dialer.run", undefined, undefined, { placed: r.placed, failed: r.failed });
  revalidatePath("/app/campaigns");
  if (!r.status.ready) return fail(r.status.reasons.join(" "));
  if (!r.status.free) return ok("All lines are busy, the next round starts when a call ends.");
  return ok(r.placed || r.failed ? `Placed ${r.placed} call${r.placed === 1 ? "" : "s"}${r.failed ? `, ${r.failed} failed (see Calls)` : ""}.` : "No contacts are due right now.");
}

/** Called by the live-dialing toggle on the campaign page while it is open. */
export async function dialerPulse(): Promise<{ placed: number; ready: boolean; reasons: string[] }> {
  await requireUser(MANAGERS);
  const r = await runDialer();
  return { placed: r.placed, ready: r.status.ready, reasons: r.status.reasons };
}

export async function setOutbound(fd: FormData) {
  const user = await requireUser(MANAGERS);
  const on = str(fd, "on") === "1";
  await prisma.settings.update({ where: { id: 1 }, data: { outboundEnabled: on } });
  await audit(user.id, on ? "dialer.on" : "dialer.off");
  revalidatePath("/app/campaigns");
  revalidatePath("/app/settings");
}

// --- Follow-ups and appointments ------------------------------------------------------

export async function updateTask(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(TEAM);
  const id = num(fd, "id");
  const status = z.enum(["OPEN", "IN_PROGRESS", "DONE"]).safeParse(str(fd, "status"));
  if (!status.success) return fail("Choose a valid status.");
  const resolution = str(fd, "resolution", 5000);
  if (status.data === "DONE" && !resolution) return fail("Write what the customer was told before closing.");
  const assignee = str(fd, "assigneeId");
  const task = await prisma.task.update({
    where: { id },
    data: { status: status.data, resolution: resolution || null, doneAt: status.data === "DONE" ? new Date() : null, assigneeId: assignee ? Number(assignee) : null },
  });
  // Teach the agent: the team's answer becomes a knowledge passage (managers only — it is what callers will hear).
  if (status.data === "DONE" && fd.get("addToKnowledge") === "on" && resolution && MANAGERS.includes(user.role)) {
    const title = `Team answer: ${task.title.slice(0, 80)}`;
    const exists = await prisma.knowledgeDocument.findFirst({ where: { title, status: "ACTIVE" }, select: { id: true } });
    if (!exists) await ingestText({ title, category: "faq", text: `## ${(task.details || task.title).replace(/\s+/g, " ").slice(0, 200)}\n${resolution}`, userId: user.id, kind: "md" });
  }
  await audit(user.id, "task.update", "Task", id, { status: status.data });
  revalidatePath("/app/follow-ups");
  return ok("Saved.");
}

export async function setAppointmentStatus(fd: FormData) {
  const user = await requireUser(TEAM);
  const id = num(fd, "id");
  const status = z.enum(["BOOKED", "DONE", "CANCELLED"]).safeParse(str(fd, "status"));
  if (!status.success) return;
  await prisma.appointment.update({ where: { id }, data: { status: status.data } });
  await audit(user.id, "appointment.status", "Appointment", id, { status: status.data });
  revalidatePath("/app/appointments");
}

// --- Knowledge -------------------------------------------------------------------

export async function uploadKnowledge(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(MANAGERS);
  const file = fd.get("file");
  const text = String(fd.get("text") ?? "").trim().slice(0, 500_000);
  const title = str(fd, "title", 200);
  const category = str(fd, "category", 40) || "general";
  if (!title) return fail("Give the document a title.");
  try {
    let doc;
    if (file instanceof File && file.size > 0) {
      if (file.size > 4_000_000) return fail("File is too large (max 4 MB). Split it, or paste the text instead.");
      doc = await ingestFile(file, { title, category, userId: user.id });
    } else if (text) {
      doc = await ingestText({ title, category, text, userId: user.id, kind: /^#{1,3}\s/m.test(text) ? "md" : "txt" });
    } else return fail("Choose a file or paste some text.");
    await audit(user.id, "knowledge.add", "KnowledgeDocument", doc.id);
    revalidatePath("/app/knowledge");
    return ok(`Added "${doc.title}" (${doc._count.chunks} passages). Calls use it within a minute.`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Could not read this file.");
  }
}

export async function setDocumentStatus(fd: FormData) {
  const user = await requireUser(MANAGERS);
  const id = num(fd, "id");
  const status = str(fd, "status") === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
  await prisma.knowledgeDocument.update({ where: { id }, data: { status } });
  invalidateKnowledge();
  await audit(user.id, "knowledge.status", "KnowledgeDocument", id, { status });
  revalidatePath("/app/knowledge");
}

// --- Settings ---------------------------------------------------------------------

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const SettingsInput = z.object({
  businessName: z.string().trim().min(1).max(120),
  agentName: z.string().trim().min(1).max(60),
  vapiAssistantId: z.string().trim().max(80).regex(/^[A-Za-z0-9-]*$/, "Assistant id: letters, numbers and dashes only"),
  vapiPhoneNumbers: z.string().trim().max(400).regex(/^[A-Za-z0-9,\s-]*$/, "Phone number ids: letters, numbers, dashes, commas"),
  defaultCountry: z.string().regex(/^\+\d{1,3}$/, "Default country code like +91 or +1"),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone (use e.g. Asia/Kolkata, America/New_York)"),
  callingStart: hhmm,
  callingEnd: hhmm,
  maxAttempts: z.coerce.number().int().min(1).max(10),
  retryGapMinutes: z.coerce.number().int().min(15).max(10_080),
  maxConcurrent: z.coerce.number().int().min(1).max(50),
  monthlyBudgetUsd: z.coerce.number().int().min(0).max(1_000_000),
  followUpHours: z.coerce.number().int().min(1).max(168),
});

export async function saveSettings(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(MANAGERS);
  const parsed = SettingsInput.safeParse(Object.fromEntries(Object.keys(SettingsInput.shape).map((k) => [k, str(fd, k, 400)])));
  if (!parsed.success) return fail(parsed.error.issues.map((i) => i.message).join(" · "));
  const d = parsed.data;
  await prisma.settings.update({
    where: { id: 1 },
    data: { ...d, vapiAssistantId: d.vapiAssistantId || null, vapiPhoneNumbers: d.vapiPhoneNumbers.split(/[\s,]+/).filter(Boolean).join(",") || null, outboundEnabled: fd.get("outboundEnabled") === "on" },
  });
  await audit(user.id, "settings.update");
  revalidatePath("/app/settings");
  return ok("Settings saved.");
}

// --- Users ----------------------------------------------------------------------------

export async function createUser(_p: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser(ADMINS);
  const mail = str(fd, "email", 160).toLowerCase();
  const name = str(fd, "name", 120);
  const password = String(fd.get("password") ?? "");
  const role = ROLES.find((r) => r === str(fd, "role"));
  if (!name || !email.safeParse(mail).success) return fail("Enter a name and a valid email.");
  const problem = passwordProblem(password);
  if (problem) return fail(problem);
  if (!role) return fail("Choose a role.");
  if (await prisma.user.findUnique({ where: { email: mail } })) return fail("A user with this email already exists.");
  const created = await prisma.user.create({ data: { email: mail, name, role, passwordHash: await hashPassword(password) } });
  await audit(user.id, "user.create", "User", created.id, { role });
  revalidatePath("/app/users");
  return ok(`Created ${name}. They set up two-factor sign-in the first time they sign in.`);
}

export async function setUserRole(fd: FormData) {
  const admin = await requireUser(ADMINS);
  const id = num(fd, "id");
  const role = ROLES.find((r) => r === str(fd, "role"));
  if (!role || id === admin.id) return;
  await prisma.user.update({ where: { id }, data: { role, sessionVersion: { increment: 1 } } });
  await audit(admin.id, "user.role", "User", id, { role });
  revalidatePath("/app/users");
}

export async function toggleUser(fd: FormData) {
  const user = await requireUser(ADMINS);
  const id = num(fd, "id");
  if (id === user.id) return; // never lock yourself out
  const target = await prisma.user.findUniqueOrThrow({ where: { id } });
  await prisma.user.update({ where: { id }, data: { active: !target.active, sessionVersion: { increment: 1 } } });
  await audit(user.id, target.active ? "user.deactivate" : "user.activate", "User", id);
  revalidatePath("/app/users");
}

/** Super Admin: remove someone's authenticator (lost phone). They set it up again at next sign-in. */
export async function resetUserMfa(fd: FormData) {
  const admin = await requireUser(ADMINS);
  const id = num(fd, "id");
  if (id === admin.id) return;
  await prisma.user.update({
    where: { id },
    data: { mfaSecret: null, mfaEnabledAt: null, mfaRecovery: Prisma.DbNull, mfaLastStep: null, sessionVersion: { increment: 1 } },
  });
  await audit(admin.id, "mfa.reset", "User", id);
  revalidatePath("/app/users");
}

// --- My account ---------------------------------------------------------------------

export async function changeOwnPassword(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(current, user.passwordHash))) return fail("Current password is wrong.");
  const problem = passwordProblem(next);
  if (problem) return fail(problem);
  if (next !== confirm) return fail("The new passwords do not match.");
  if (next === current) return fail("Choose a password you have not used here.");
  // New password → every other signed-in browser is signed out; this one gets a fresh session.
  const updated = await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } } });
  await reissueSession(updated);
  await audit(me.id, "user.password_changed", "User", me.id);
  return ok("Password changed. Other devices were signed out.");
}

async function reissueSession(u: { id: number; role: RoleValue; name: string; sessionVersion: number }) {
  const token = await signSession({ sub: String(u.id), role: u.role, name: u.name, v: u.sessionVersion, mfa: true });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
}

export type RecoveryState = { ok?: string; error?: string; codes?: string[]; at?: number } | undefined;

/** New set of recovery codes (old ones stop working). Needs a current authenticator code. */
export async function regenerateRecoveryCodes(_p: RecoveryState, fd: FormData): Promise<RecoveryState> {
  const me = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!user.mfaSecret) return { error: "Two-factor sign-in is not set up." };
  const step = verifyCode(decryptSecret(user.mfaSecret), String(fd.get("code") ?? ""), user.mfaLastStep);
  if (step === null) {
    await audit(me.id, "mfa.failed", "User", me.id);
    return { error: "That code is not right." };
  }
  const claimed = await prisma.user.updateMany({
    where: { id: me.id, OR: [{ mfaLastStep: null }, { mfaLastStep: { lt: step } }] },
    data: { mfaLastStep: step },
  });
  if (claimed.count !== 1) return { error: "That code was already used — wait for the next one." };
  const codes = newRecoveryCodes();
  await prisma.user.update({ where: { id: me.id }, data: { mfaRecovery: codes.map(hashRecovery) } });
  await audit(me.id, "mfa.recovery_regenerated", "User", me.id);
  return { codes, ok: "New recovery codes — the old ones no longer work.", at: Date.now() };
}
