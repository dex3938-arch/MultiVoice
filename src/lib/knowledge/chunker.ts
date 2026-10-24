/**
 * Semantic chunking: keeps headings with their text, splits on paragraph
 * then sentence boundaries, never mid-sentence, with a one-sentence overlap
 * between consecutive chunks of the same section.
 */

export type Section = { heading?: string; text: string; metadata?: Record<string, unknown> };
export type Chunk = { heading?: string; text: string; metadata?: Record<string, unknown> };

const TARGET = 650; // fits the 700-character passages the AI reads
const HARD_MAX = 1400;

/** Sentences end at . ! ? । followed by a space, so ".NET", "3.5" and "e.g." inside a sentence stay whole. */
const sentences = (p: string) => p.split(/(?<=[.!?।]["')\]]*)\s+/).map((s) => s.trim()).filter(Boolean);

export function chunkSections(sections: Section[]): Chunk[] {
  const out: Chunk[] = [];
  for (const s of sections) {
    const text = s.text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) continue;
    if (text.length <= TARGET) {
      out.push({ heading: s.heading, text, metadata: s.metadata });
      continue;
    }
    let buf: string[] = [];
    let len = 0;
    const flush = (overlap: boolean) => {
      if (!buf.length) return;
      out.push({ heading: s.heading, text: buf.join(" "), metadata: s.metadata });
      const last = buf[buf.length - 1];
      buf = overlap && last.length < 300 ? [last] : [];
      len = buf.reduce((n, x) => n + x.length + 1, 0);
    };
    for (const para of text.split(/\n\s*\n/)) {
      for (const sentence of sentences(para)) {
        const piece = sentence.length > HARD_MAX ? sentence.slice(0, HARD_MAX) : sentence;
        if (len + piece.length > TARGET && len > 0) flush(true);
        buf.push(piece);
        len += piece.length + 1;
      }
    }
    flush(false);
  }
  return out;
}

/**
 * Split free text (uploads) into sections. Headings are: markdown "## …"; otherwise a short line that is a
 * question ("What is Java?", "Q3. How do I pay?"), a numbered heading ("2.1 Installation"), "Chapter 4 …" or
 * ALL CAPS. "A:" / "Answer:" prefixes are dropped from answers.
 */
export function sectionsFromText(text: string, fallbackHeading?: string): Section[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const sections: Section[] = [];
  let heading = fallbackHeading;
  let body: string[] = [];
  const push = () => {
    if (body.join("").trim()) sections.push({ heading, text: body.join("\n") });
    body = [];
  };
  // Documents written with "## Question" headings: other heading styles inside answers are text.
  const hasMarkdown = lines.some((l) => /^\s*#{1,4}\s+\S/.test(l));
  for (const raw of lines) {
    const line = raw.trim();
    const md = raw.match(/^\s*#{1,4}\s+(.+)/);
    let h: string | null = md ? md[1].trim() : null;
    if (!h && !hasMarkdown && line.length >= 6 && line.length <= 200) {
      const q = line.match(/^(?:q(?:uestion)?\s*\d*\s*[:.)-]\s*)?(.+\?)$/i);
      if (q) h = q[1].trim();
      else if (line.length < 90 && !/[.,;:]$/.test(line)) {
        if (/^(chapter|section|part|unit|module|lesson)\s+[\w.]+/i.test(line) || /^\d+(\.\d+){0,3}\.?\s+[A-Z][^.!?]*$/.test(line)) h = line;
        else if (line.length > 3 && line === line.toUpperCase() && /[A-Z]{3}/.test(line)) h = line;
      }
    }
    if (h) {
      push();
      heading = h.slice(0, 300);
    } else body.push(raw.replace(/^\s*(a|ans|answer)\s*[:.)-]\s*/i, ""));
  }
  push();
  return sections;
}
