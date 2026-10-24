import "server-only";
import { prisma } from "../db";
import { Bm25Index } from "./bm25";
import { chunkSections } from "./chunker";
import { extractDocument, kindFromName, toSections, type UploadKind } from "./loaders";

/**
 * Knowledge base for the agent: uploaded documents → passages → keyword search (BM25, English/Hindi/Hinglish).
 * The Vapi assistant reaches it through the `search_knowledge` tool.
 */

export type KnowledgeHit = { title: string; heading: string | null; text: string; score: number; confidence: number };
type Item = { id: number; heading: string | null; topic: string | null; text: string; title: string };

/**
 * A long section is split into several passages that share its heading. Only the first one is indexed with
 * the heading (that is where the answer starts); the others are found by their own words. Every passage
 * still shows its section as `topic`.
 */
export function withTopics<T extends { doc: number; heading: string | null }>(rows: T[]): (Omit<T, "heading"> & { heading: string | null; topic: string | null })[] {
  let prev: { doc: number; heading: string | null } | null = null;
  return rows.map((r) => {
    const continuation = prev !== null && prev.doc === r.doc && prev.heading === r.heading && r.heading !== null;
    prev = { doc: r.doc, heading: r.heading };
    return { ...r, topic: r.heading, heading: continuation ? null : r.heading };
  });
}
let cached: { key: string; checkedAt: number; index: Bm25Index<Item> } | null = null;
/** How often (ms) to check whether documents changed. The check is one tiny query; rebuilding only on change. */
const CHECK_EVERY = 5_000;

export function invalidateKnowledge() {
  cached = null;
}

async function index() {
  if (cached && Date.now() - cached.checkedAt < CHECK_EVERY) return cached.index;
  // Fingerprint of the active knowledge: number of passages + newest passage id + active document ids.
  const [agg, docs] = await Promise.all([
    prisma.knowledgeChunk.aggregate({ where: { document: { status: "ACTIVE" } }, _count: true, _max: { id: true } }),
    prisma.knowledgeDocument.findMany({ where: { status: "ACTIVE" }, select: { id: true }, orderBy: { id: "asc" } }),
  ]);
  const key = `${agg._count}:${agg._max.id ?? 0}:${docs.map((d) => d.id).join(",")}`;
  if (cached && cached.key === key) {
    cached.checkedAt = Date.now();
    return cached.index;
  }
  const rows = await prisma.knowledgeChunk.findMany({
    where: { document: { status: "ACTIVE" } },
    select: { id: true, documentId: true, position: true, heading: true, text: true, document: { select: { title: true } } },
    orderBy: [{ documentId: "asc" }, { position: "asc" }],
  });
  const idx = new Bm25Index<Item>(withTopics(rows.map((r) => ({ id: r.id, doc: r.documentId, heading: r.heading, text: r.text, title: r.document.title }))));
  cached = { key, checkedAt: Date.now(), index: idx };
  return idx;
}

/** Below this share of the question's meaningful words, a passage is not an answer. */
export const KNOWLEDGE_MIN_CONFIDENCE = 0.5;

/** Passage text for the agent: whole sentences, at most ~700 characters. */
export function answerText(text: string, max = 700) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "), cut.lastIndexOf("। "));
  return end > max * 0.5 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export async function searchKnowledge(question: string, limit = 3): Promise<KnowledgeHit[]> {
  const idx = await index();
  return idx.search(question, limit).map((h) => ({ title: h.item.title, heading: h.item.topic ?? null, text: h.item.text, score: h.score, confidence: h.matched }));
}

/** Passages ready to store (the same rules for every format). */
export function prepareChunks(kind: UploadKind, text: string, title: string) {
  return chunkSections(toSections(kind, text, title)).map((c, i) => ({ position: i, heading: c.heading?.slice(0, 300) ?? null, text: c.text }));
}

export const MAX_TEXT = 3_000_000; // about 1,000 pages of text

export async function ingestText(input: { title: string; category: string; text: string; fileName?: string; userId?: number; kind?: UploadKind | null; pages?: number | null }) {
  const text = input.text.slice(0, MAX_TEXT);
  const chunks = prepareChunks(input.kind ?? "txt", text, input.title);
  if (!chunks.length) throw new Error("No readable text found. Scanned PDFs (photos of pages) cannot be read: use a PDF with selectable text.");
  const doc = await prisma.knowledgeDocument.create({
    data: { title: input.title, category: input.category, fileName: input.fileName, uploadedById: input.userId, pages: input.pages ?? null, chars: text.length },
  });
  // Large documents: insert in batches (one round trip per 500 passages). All or nothing.
  try {
    for (let i = 0; i < chunks.length; i += 500) {
      await prisma.knowledgeChunk.createMany({ data: chunks.slice(i, i + 500).map((c) => ({ ...c, documentId: doc.id })) });
    }
  } catch (e) {
    await prisma.knowledgeDocument.delete({ where: { id: doc.id } }).catch(() => undefined);
    throw e;
  }
  invalidateKnowledge();
  return { ...doc, _count: { chunks: chunks.length } };
}

export async function ingestFile(file: File, meta: { title: string; category: string; userId?: number }) {
  const kind = kindFromName(file.name, file.type);
  if (!kind) throw new Error("Unsupported file. Use PDF, Word (.docx), TXT, Markdown, CSV or JSON.");
  const { text, pages } = await extractDocument(kind, Buffer.from(await file.arrayBuffer()));
  return ingestText({ ...meta, text, fileName: file.name, kind, pages });
}
