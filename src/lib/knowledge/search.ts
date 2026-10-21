import "server-only";
import { prisma } from "../db";
import { Bm25Index } from "./bm25";
import { chunkSections } from "./chunker";
import { extractText, kindFromName, toSections } from "./loaders";

/**
 * Knowledge base for the agent: uploaded documents → passages → keyword search (BM25, English/Hindi/Hinglish).
 * The Vapi assistant reaches it through the `search_knowledge` tool.
 */

export type KnowledgeHit = { title: string; heading: string | null; text: string; score: number; confidence: number };
type Item = { id: number; heading: string | null; text: string; title: string };
let cached: { at: number; index: Bm25Index<Item> } | null = null;
const TTL = 60_000;

export function invalidateKnowledge() {
  cached = null;
}

async function index() {
  if (cached && Date.now() - cached.at < TTL) return cached.index;
  const rows = await prisma.knowledgeChunk.findMany({
    where: { document: { status: "ACTIVE" } },
    select: { id: true, heading: true, text: true, document: { select: { title: true } } },
  });
  const idx = new Bm25Index<Item>(rows.map((r) => ({ id: r.id, heading: r.heading, text: r.text, title: r.document.title })));
  cached = { at: Date.now(), index: idx };
  return idx;
}

export async function searchKnowledge(question: string, limit = 3): Promise<KnowledgeHit[]> {
  const idx = await index();
  return idx.search(question, limit).map((h) => ({ title: h.item.title, heading: h.item.heading ?? null, text: h.item.text, score: h.score, confidence: h.matched }));
}

export async function ingestText(input: { title: string; category: string; text: string; fileName?: string; userId?: number; kind?: ReturnType<typeof kindFromName> }) {
  const chunks = chunkSections(toSections(input.kind ?? "txt", input.text, input.title));
  if (!chunks.length) throw new Error("No readable text found. Scanned PDFs (photos of pages) cannot be read.");
  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: input.title,
      category: input.category,
      fileName: input.fileName,
      uploadedById: input.userId,
      chunks: { create: chunks.map((c, i) => ({ position: i, heading: c.heading?.slice(0, 300) ?? null, text: c.text })) },
    },
    include: { _count: { select: { chunks: true } } },
  });
  invalidateKnowledge();
  return doc;
}

export async function ingestFile(file: File, meta: { title: string; category: string; userId?: number }) {
  const kind = kindFromName(file.name, file.type);
  if (!kind) throw new Error("Unsupported file. Use PDF, Word (.docx), TXT, Markdown, CSV or JSON.");
  const text = await extractText(kind, Buffer.from(await file.arrayBuffer()));
  return ingestText({ ...meta, text, fileName: file.name, kind });
}
