import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Bm25Index } from "../src/lib/knowledge/bm25";
import { chunkSections } from "../src/lib/knowledge/chunker";
import { toSections } from "../src/lib/knowledge/loaders";

const text = readFileSync(new URL("../prisma/seed-data/sample-faq.md", import.meta.url), "utf8");
const chunks = chunkSections(toSections("md", text, "Sample FAQ"));
const index = new Bm25Index(chunks.map((c, i) => ({ id: i, heading: c.heading ?? null, text: c.text, title: "Sample FAQ" })));
const top = (q: string) => index.search(q, 1)[0]?.item.heading ?? null;

describe("knowledge search", () => {
  it("splits the FAQ into one passage per question", () => {
    expect(chunks.length).toBeGreaterThanOrEqual(7);
  });
  it("finds the right answer, including synonyms", () => {
    expect(top("what time do you open?")).toMatch(/opening hours/i);
    expect(top("what's your address")).toMatch(/located/i);
    expect(top("how much is the fee")).toMatch(/cost/i);
    expect(top("can I get my money back")).toMatch(/refund/i);
    expect(top("i want to book a meeting")).toMatch(/appointment/i);
  });
  it("is not confident about unrelated questions", () => {
    const hit = index.search("do you sell spaceships to mars", 1)[0];
    expect(!hit || hit.matched < 0.5).toBe(true);
  });
});
