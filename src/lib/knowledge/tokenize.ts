/**
 * Tokeniser shared by indexing and querying. Handles English, Devanagari and Hinglish, with a small synonym map
 * so "kimat kitni hai", "कीमत" and "price" all hit the same FAQ entry.
 */

const STOP = new Set(
  (
    "a an the is are was were be been of to in on for and or with by at from as it this that these those what which who how do does did can could " +
    "will would should i me my we our you your they them their there here about into than then so if not no yes please tell want need " +
    "explain describe define meaning mean know people someone something anything give let us also just really much many very " +
    "kya hai hain ka ki ke ko se me mein mai main par pe aur ya bhi hota hoti hote mera mere meri mujhe aap apna apne hum ham kaise kaun " +
    "kitna kitne kitni chahiye karna karni karta karte karu kare batao bataiye ji haan nahi na tha thi wala wali wale liye sakte sakta " +
    "milega milegi milenge hoga hogi rahega raha rahi abhi bas toh to hi kuch thoda karein kariye karo sakta sakti " +
    "है हैं का की के को से में मैं पर और या भी होता होती मेरा मेरे मेरी मुझे आप हम कैसे कौन कितना कितने कितनी चाहिए करना क्या " +
    "मिलेगा मिलेगी मिलेंगे होगा होगी करें करे करिए बताइए बताओ जी हाँ नहीं"
  ).split(/\s+/),
);

/** Everyday synonyms (English, Hinglish, Hindi) → one canonical term, applied to questions and documents alike. */
const SYNONYMS: Record<string, string[]> = {
  kimat: ["price", "cost"], keemat: ["price", "cost"], कीमत: ["price", "cost"], daam: ["price", "cost"], rate: ["price"], charges: ["price", "cost"], fee: ["price", "cost"], fees: ["price", "cost"], pricing: ["price"],
  guarantee: ["warranty"], वारंटी: ["warranty"], गारंटी: ["warranty"],
  refund: ["refund", "return"], money: ["money", "refund"], reimburse: ["refund"], wapas: ["refund", "return"], वापस: ["refund", "return"], cancel: ["cancel", "cancellation"], cancellation: ["cancel"],
  appointment: ["appointment", "booking", "meeting"], booking: ["appointment", "booking"], meeting: ["appointment", "meeting"], slot: ["appointment", "time"], demo: ["demo", "appointment"],
  timing: ["hours", "time"], timings: ["hours", "time"], hours: ["hours", "time"], kab: ["when", "time"], कब: ["when", "time"], samay: ["time"], समय: ["time"], open: ["hours", "open"], khulta: ["open", "hours"],
  kahan: ["where", "location", "address"], kaha: ["where", "location"], कहाँ: ["where", "location"], address: ["location", "address"], branch: ["location", "branch"], shehar: ["city", "location"], शहर: ["city", "location"],
  delivery: ["delivery", "shipping"], shipping: ["delivery", "shipping"], dispatch: ["delivery"],
  payment: ["payment", "pay"], pay: ["payment"], upi: ["payment", "upi"], emi: ["emi", "loan", "finance"], loan: ["loan", "finance"], लोन: ["loan", "finance"], kist: ["emi"],
  support: ["support", "service", "help"], service: ["service", "support"], help: ["support", "help"], madad: ["help", "support"], मदद: ["help", "support"], complaint: ["complaint", "support"], shikayat: ["complaint"], शिकायत: ["complaint"],
  saal: ["year"], sal: ["year"], साल: ["year"], years: ["year"], mahina: ["month"], महीना: ["month"],
  oop: ["object", "oriented"], oops: ["object", "oriented"], ml: ["machine", "learning"], db: ["database"], api: ["api", "interface"],
  discount: ["discount", "offer"], offer: ["offer", "discount"], chhoot: ["discount"], छूट: ["discount"],
};

/**
 * Light English stemmer: plural / -ing / -ed / final e removed, so "language", "languages", "coding",
 * "code", "programming" and "program" meet. Non-Latin words are kept as they are.
 */
export function stem(w: string): string {
  if (!/^[a-z]+$/.test(w) || w.length < 3) return w;
  let s = w;
  if (s.length > 5 && s.endsWith("ies")) s = `${s.slice(0, -3)}y`;
  else if (/(ss|sh|ch|x|z)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 6 && s.endsWith("ings")) s = s.slice(0, -4);
  else if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 3 && s.endsWith("ed")) s = s.slice(0, -2);
  else if (s.endsWith("s") && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1);
  if (/([b-df-hj-np-tv-z])\1$/.test(s) && !/(ll|ss|zz)$/.test(s)) s = s.slice(0, -1);
  if (s.length > 2 && s.endsWith("e") && !s.endsWith("ee")) s = s.slice(0, -1);
  return s;
}

/** Technical names that lose their meaning when punctuation is stripped (C++, C#, .NET, Node.js …). */
const TECH: [RegExp, string][] = [
  [/c\+\+/g, " cplusplus "],
  [/(^|[^a-z])c#/g, "$1 csharp "],
  [/(^|[^a-z])f#/g, "$1 fsharp "],
  [/\.net\b/g, " dotnet "],
  [/\bnode\s?\.?\s?js\b/g, " nodejs "],
  [/\bnext\.?js\b/g, " nextjs "],
  [/\breact\.?js\b/g, " react "],
  [/\bvue\.?js\b/g, " vue "],
  [/\bjs\b/g, " javascript "],
  [/\bts\b/g, " typescript "],
  [/\bai\/ml\b/g, " ai ml "],
];
const normalize = (text: string) => TECH.reduce((t, [re, to]) => t.replace(re, to), text.toLowerCase().normalize("NFKC"));

/**
 * One group per meaningful word: the word (stemmed) plus its synonyms (stemmed too, so "मीटरिंग" →
 * "meter" matches "metering" in a document). A query word counts as found if any member is found.
 */
export function termGroups(text: string): string[][] {
  // \p{M}: Devanagari vowel signs (matras) are combining marks, not letters.
  const words = normalize(text).match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  const out: string[][] = [];
  for (const w of words) {
    if (STOP.has(w) || (w.length < 2 && !/\d/.test(w))) continue;
    out.push([...new Set([stem(w), ...(SYNONYMS[w] ?? []).map(stem)])]);
  }
  return out;
}

/** Flat token list (documents are indexed with every synonym). */
export function tokenize(text: string): string[] {
  return termGroups(text).flat();
}
