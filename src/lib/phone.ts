/**
 * Phone numbers are stored in E.164 (+<country><number>), which is what Vapi needs.
 * Numbers typed without a country code get the default one from Settings (e.g. +91).
 */
export function toE164(raw: string, defaultCountry = "+91"): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    const cc = defaultCountry.replace(/\D/g, "");
    digits = digits.replace(/^0+/, "");
    // Already includes the country code without "+" (e.g. 919876543210)
    digits = digits.startsWith(cc) && digits.length > cc.length + 8 ? `+${digits}` : `+${cc}${digits}`;
  }
  const n = digits.slice(1).replace(/\D/g, "");
  if (n.length < 8 || n.length > 15 || n.startsWith("0")) return null;
  return `+${n}`;
}

/** Readable number for display ("+91 98765 43210", "+1 (415) 555-0123"). Only the last 4 digits when `masked`. */
export function formatPhone(e164: string | null | undefined, masked = false) {
  if (!e164) return "—";
  if (masked) return `•••• ${e164.slice(-4)}`;
  let m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (m) return `+1 (${m[1]}) ${m[2]}-${m[3]}`;
  m = e164.match(/^\+91(\d{5})(\d{5})$/);
  if (m) return `+91 ${m[1]} ${m[2]}`;
  m = e164.match(/^\+44(\d{4})(\d{6})$/);
  if (m) return `+44 ${m[1]} ${m[2]}`;
  return e164;
}
