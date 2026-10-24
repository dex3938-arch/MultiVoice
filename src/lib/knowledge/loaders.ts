import { sectionsFromText, type Section } from "./chunker";

/**
 * File loaders for knowledge uploads: PDF, DOCX, TXT, Markdown, CSV, JSON.
 * Heavy parsers are imported lazily so they never load on normal requests.
 */

export const SUPPORTED_UPLOADS = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/json": "json",
} as const;

export type UploadKind = (typeof SUPPORTED_UPLOADS)[keyof typeof SUPPORTED_UPLOADS];

/** The file's extension decides (the type a browser reports can be wrong); the reported type is only a fallback. */
export function kindFromName(fileName: string, mime?: string): UploadKind | null {
  const ext = fileName.toLowerCase().split(".").pop();
  const map: Record<string, UploadKind> = { pdf: "pdf", docx: "docx", txt: "txt", md: "md", markdown: "md", csv: "csv", json: "json" };
  if (ext && map[ext]) return map[ext];
  if (mime && mime in SUPPORTED_UPLOADS) return SUPPORTED_UPLOADS[mime as keyof typeof SUPPORTED_UPLOADS];
  return null;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
/** Word document → text that keeps Word headings as "## …" lines, so each FAQ question stays with its answer. */
function docxHtmlToText(html: string) {
  return html
    .replace(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi, (_, t: string) => `\n## ${t.replace(/<[^>]+>/g, "").trim()}\n`)
    // A paragraph that is all bold and ends with "?" is a question heading too (how most people write FAQs in Word).
    .replace(/<p[^>]*>\s*<(strong|b)>([^<]{3,250}\?)\s*<\/\1>\s*<\/p>/gi, (_, _t: string, q: string) => `\n## ${q.trim()}\n`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|tr|table|ul|ol)>|<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#39|amp|lt|gt|quot|apos|nbsp);/g, (_, e: string) => ENTITIES[e] ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * PDF pages → clean text: drops running headers/footers and page numbers, re-joins words split by a
 * hyphen at the end of a line and lines that wrap inside a paragraph, keeps headings and list items apart.
 */
export function cleanPdfPages(pages: string[]): string {
  const split = pages.map((p) => p.replace(/\r/g, "").split("\n").map((l) => l.replace(/[ \t\u00a0]+/g, " ").trim()));
  const pageNo = /^(page\s*)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$|^[-–]\s*\d{1,4}\s*[-–]$/i;
  // Lines at the top or bottom of many pages (company name, "Confidential", "Page 3 of 90") are page furniture.
  const edge = (lines: string[]) => {
    const real = lines.filter((l) => l && !pageNo.test(l));
    return [...real.slice(0, 2), ...real.slice(-1)];
  };
  const seen = new Map<string, number>();
  for (const lines of split) for (const l of new Set(edge(lines).map((x) => x.replace(/\d+/g, "#")))) if (l && l.length < 90) seen.set(l, (seen.get(l) ?? 0) + 1);
  const furniture = pages.length >= 4 ? new Set([...seen].filter(([, n]) => n >= Math.max(3, pages.length * 0.5)).map(([l]) => l)) : new Set<string>();
  const out: string[] = [];
  for (const lines of split) {
    const edges = new Set(edge(lines));
    const kept = lines.filter((l) => l && !pageNo.test(l) && !(edges.has(l) && furniture.has(l.replace(/\d+/g, "#"))));
    let para = "";
    const flush = () => {
      if (para) out.push(para);
      para = "";
    };
    for (const line of kept) {
      const startsBlock = /^([-•*▪●◦]|\d+[.)]|[a-z][.)]|#{1,4}\s|q\d*[:.)]|question\b|a:|ans(wer)?:)/i.test(line);
      const isQuestion = /\?$/.test(line) && line.length <= 200;
      const isHeading = line.length < 90 && !/[.,;:]$/.test(line) && (/^[A-Z0-9][^a-z]*$/.test(line) || /^(chapter|section|part|unit)\s+\w+/i.test(line) || /^\d+(\.\d+){0,3}\.?\s+[A-Z]/.test(line));
      if (!para) para = line;
      else if (para.endsWith("-") && /^[a-z]/.test(line)) para = para.slice(0, -1) + line; // hyphenated word
      else if (startsBlock || isQuestion || isHeading || /[.!?:]["')\]]?$/.test(para) || /\?$/.test(para)) {
        flush();
        para = line;
      } else para += ` ${line}`; // the line wrapped inside a paragraph
      if (isQuestion || isHeading) flush();
    }
    flush();
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function extractDocument(kind: UploadKind, buf: Buffer): Promise<{ text: string; pages: number | null }> {
  switch (kind) {
    case "pdf": {
      const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buf), { verbosity: 0 });
      const { text, totalPages } = await pdfText(pdf, { mergePages: false });
      const pages = Array.isArray(text) ? text : [text];
      return { text: cleanPdfPages(pages), pages: totalPages ?? pages.length };
    }
    case "docx": {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.convertToHtml({ buffer: buf });
      return { text: docxHtmlToText(value), pages: null };
    }
    default:
      return { text: buf.toString("utf8").replace(/^\uFEFF/, ""), pages: null };
  }
}

export const extractText = async (kind: UploadKind, buf: Buffer) => (await extractDocument(kind, buf)).text;

/** Turn extracted content into sections (structure-aware for CSV/JSON). */
export function toSections(kind: UploadKind, raw: string, title: string): Section[] {
  if (kind === "csv") {
    const rows = parseCsv(raw);
    const [header, ...data] = rows;
    if (!header) return [];
    return data
      .filter((r) => r.some((c) => c.trim()))
      .map((r) => ({
        heading: r[0] ? `${title} — ${r[0]}` : title,
        text: header.map((h, i) => (r[i] ? `${h}: ${r[i]}` : "")).filter(Boolean).join("\n"),
      }));
  }
  if (kind === "json") {
    try {
      const data = JSON.parse(raw) as unknown;
      const items = Array.isArray(data) ? data : [data];
      return items.map((item, i) => ({ heading: `${title} — item ${i + 1}`, text: flatten(item).join("\n") }));
    } catch {
      return sectionsFromText(raw, title);
    }
  }
  return sectionsFromText(raw, title);
}

function flatten(v: unknown, prefix = ""): string[] {
  if (v === null || v === undefined) return [];
  if (typeof v !== "object") return [`${prefix}${String(v)}`];
  if (Array.isArray(v)) return v.flatMap((x) => flatten(x, prefix));
  return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) =>
    typeof x === "object" && x !== null ? flatten(x, `${prefix}${k} › `) : [`${prefix}${k}: ${String(x)}`],
  );
}

/** RFC-4180 CSV (quoted fields with commas, doubled quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
