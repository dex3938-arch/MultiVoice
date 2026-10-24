import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Bm25Index } from "../src/lib/knowledge/bm25";
import { cleanPdfPages, extractDocument } from "../src/lib/knowledge/loaders";
import { answerText, prepareChunks, withTopics } from "../src/lib/knowledge/search";

/**
 * A real 100-page PDF (test/fixtures/handbook-100-pages.pdf): chapters, numbered headings, FAQ questions in
 * bold without markdown, a running header and "Page N of 100" footer on every page, filler text in between.
 */
const pdf = readFileSync(new URL("./fixtures/handbook-100-pages.pdf", import.meta.url));

describe("100-page PDF", async () => {
  const t0 = Date.now();
  const { text, pages } = await extractDocument("pdf", pdf);
  const chunks = prepareChunks("pdf", text, "Student Handbook");
  const readMs = Date.now() - t0;
  const index = new Bm25Index(withTopics(chunks.map((c, i) => ({ id: i, doc: 1, heading: c.heading, text: c.text }))));
  const ask = (q: string) => index.search(q, 1)[0];

  it("reads every page quickly and drops page furniture", () => {
    expect(pages).toBe(100);
    expect(readMs).toBeLessThan(15_000);
    expect(text).not.toMatch(/Page \d+ of 100/);
    expect(text).not.toMatch(/Confidential/);
    expect(chunks.length).toBeGreaterThan(100);
  });

  const cases: [string, RegExp][] = [
    ["What is Java?", /object-oriented programming language used worldwide for app development/],
    ["tell me about the java language", /Java Virtual Machine/],
    ["what do people use python for", /data science/],
    ["What is C++", /extends C with classes/],
    ["what is c#", /\.NET platform/],
    ["explain node js", /event loop/],
    ["what is sql", /relational databases/],
    ["how many weeks is the java course", /24 weeks/],
    ["how much is the fee", /45,000 rupees/],
    ["will you help me get a job", /hiring partners/],
    ["can I get my money back", /full refund within 7 days/],
    ["are the classes online", /live online/],
    ["what time is the office open", /10 am to 7 pm/],
    ["what is oop", /classes, inheritance, encapsulation/],
    ["what is spring boot", /production-ready web services/],
    ["do I get a certificate", /verifiable digital certificate/],
  ];
  for (const [q, expected] of cases) {
    it(`answers: ${q}`, () => {
      const hit = ask(q);
      expect(hit, q).toBeTruthy();
      expect(hit.matched).toBeGreaterThanOrEqual(0.5);
      expect(answerText(hit.item.text)).toMatch(expected);
    });
  }

  it("searches 100 pages in a few milliseconds", () => {
    const t = Date.now();
    for (let i = 0; i < 50; i++) ask("What is Java?");
    expect((Date.now() - t) / 50).toBeLessThan(20);
  });

  it("is not confident about things the handbook never mentions", () => {
    const hit = ask("do you sell spaceships to mars");
    expect(!hit || hit.matched < 0.5).toBe(true);
  });
});

describe("PDF cleaning", () => {
  it("joins wrapped lines and hyphenated words, keeps questions apart", () => {
    const topics = ["Courses", "Fees", "Placements", "Support"];
    const pages = topics.map((topic, i) => `ACME Guide\n${topic} are delivered in live ses-\nsions every evening and\nincludes projects.\nWhat is Java ${i}?\nJava is a language.\nSee the ${topic.toLowerCase()} section for details.\nPage ${i + 1} of 4`);
    const t = cleanPdfPages(pages);
    expect(t).toContain("Courses are delivered in live sessions every evening and includes projects.");
    expect(t).toContain("\nWhat is Java 2?\n");
    // A line repeated inside every page body is content, not a header.
    expect(t.match(/Java is a language\./g)?.length).toBe(4);
    expect(t).not.toContain("ACME Guide");
    expect(t).not.toContain("of 4");
  });
});
