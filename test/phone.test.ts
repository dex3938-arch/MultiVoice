import { describe, expect, it } from "vitest";
import { formatPhone, toE164 } from "../src/lib/phone";

describe("phone numbers", () => {
  it("normalises to E.164", () => {
    expect(toE164("98765 43210")).toBe("+919876543210");
    expect(toE164("098765-43210")).toBe("+919876543210");
    expect(toE164("919876543210")).toBe("+919876543210");
    expect(toE164("+1 (415) 555-0123", "+1")).toBe("+14155550123");
    expect(toE164("4155550123", "+1")).toBe("+14155550123");
    expect(toE164("0044 20 7946 0958")).toBe("+442079460958");
  });
  it("rejects junk", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("12345")).toBeNull();
    expect(toE164("+1234567890123456")).toBeNull();
  });
  it("formats for display", () => {
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
    expect(formatPhone("+14155550123")).toBe("+1 (415) 555-0123");
    expect(formatPhone("+919876543210", true)).toBe("•••• 3210");
    expect(formatPhone(null)).toBe("—");
  });
});
