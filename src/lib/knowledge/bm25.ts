import { termGroups, tokenize } from "./tokenize";

/** Okapi BM25 over a small in-memory corpus (the company KB is hundreds of chunks, not millions). */
export class Bm25Index<T extends { id: number; text: string; heading?: string | null }> {
  private docs: { item: T; tf: Map<string, number>; len: number }[] = [];
  private df = new Map<string, number>();
  private avgLen = 1;
  constructor(items: T[], private k1 = 1.4, private b = 0.72) {
    for (const item of items) {
      // Headings are weighted (repeated) — they carry the topic.
      const tokens = tokenize(`${item.heading ?? ""} ${item.heading ?? ""} ${item.text}`);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push({ item, tf, len: tokens.length });
    }
    this.avgLen = this.docs.reduce((n, d) => n + d.len, 0) / Math.max(1, this.docs.length);
  }

  /**
   * `matched` (0–1, used as "confidence"): the share of the question that the passage covers, weighted by how
   * rare each word is — "warranty" counts much more than "the" or "price". A word and its synonyms count once.
   */
  search(query: string, limit = 20): { item: T; score: number; matched: number }[] {
    const seen = new Set<string>();
    const groups = termGroups(query).filter((g) => {
      const k = g.join("|");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!groups.length) return [];
    const N = this.docs.length;
    const idf = (t: string) => {
      const n = this.df.get(t) ?? 0;
      return Math.log(1 + (N - n + 0.5) / (n + 0.5));
    };
    // Weight of a query word = its most specific known form; unknown words get the average weight.
    const known = groups.map((g) => g.filter((t) => this.df.has(t)));
    const weights = known.map((k) => (k.length ? Math.max(...k.map(idf)) : NaN));
    const avg = weights.filter((w) => !Number.isNaN(w)).reduce((a, b, _, arr) => a + b / arr.length, 0) || 1;
    const w = weights.map((x) => (Number.isNaN(x) ? avg : x));
    const total = w.reduce((a, b) => a + b, 0);

    const scored = this.docs.map((d) => {
      let score = 0;
      let covered = 0;
      groups.forEach((g, i) => {
        let best = 0;
        for (const t of g) {
          const f = d.tf.get(t);
          if (!f) continue;
          best = Math.max(best, idf(t) * ((f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * d.len) / this.avgLen))));
        }
        if (best > 0) {
          score += best;
          covered += w[i];
        }
      });
      return { item: d.item, score, matched: total ? covered / total : 0 };
    });
    return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
