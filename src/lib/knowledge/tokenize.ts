/**
 * Tokeniser shared by indexing and querying. Handles English, Devanagari and Hinglish, with a small synonym map
 * so "kimat kitni hai", "कीमत" and "price" all hit the same FAQ entry.
 */

const STOP = new Set(
  (
    "a an the is are was were be been of to in on for and or with by at from as it this that these those what which who how do does did can could " +
    "will would should i me my we our you your they them their there here about into than then so if not no yes please tell want need " +
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
  discount: ["discount", "offer"], offer: ["offer", "discount"], chhoot: ["discount"], छूट: ["discount"],
};

const stem = (w: string) =>
  /^[a-z]+$/.test(w) && w.length > 4 ? w.replace(/(ings|ing|ies|es|s|ed)$/, (m) => (m === "ies" ? "y" : "")) : w;

/**
 * One group per meaningful word: the word (stemmed) plus its synonyms (stemmed too, so "मीटरिंग" →
 * "meter" matches "metering" in a document). A query word counts as found if any member is found.
 */
export function termGroups(text: string): string[][] {
  // \p{M}: Devanagari vowel signs (matras) are combining marks, not letters.
  const words = text.toLowerCase().normalize("NFKC").match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
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
