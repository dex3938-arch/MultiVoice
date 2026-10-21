import { afterEach, describe, expect, it } from "vitest";
import { webhookAuthorized } from "../src/lib/vapi";

const SECRET = "a-very-long-shared-secret-1234567890";
const h = (init: Record<string, string>) => new Headers(init);

describe("Vapi webhook authentication", () => {
  afterEach(() => {
    delete process.env.VAPI_WEBHOOK_SECRET;
  });
  it("accepts the Bearer token or the legacy header", () => {
    process.env.VAPI_WEBHOOK_SECRET = SECRET;
    expect(webhookAuthorized(h({ authorization: `Bearer ${SECRET}` }))).toBe(true);
    expect(webhookAuthorized(h({ "x-vapi-secret": SECRET }))).toBe(true);
  });
  it("refuses wrong, missing or short secrets", () => {
    process.env.VAPI_WEBHOOK_SECRET = SECRET;
    expect(webhookAuthorized(h({ authorization: "Bearer wrong" }))).toBe(false);
    expect(webhookAuthorized(h({}))).toBe(false);
    process.env.VAPI_WEBHOOK_SECRET = "short";
    expect(webhookAuthorized(h({ authorization: "Bearer short" }))).toBe(false);
    delete process.env.VAPI_WEBHOOK_SECRET;
    expect(webhookAuthorized(h({ authorization: "Bearer " }))).toBe(false);
  });
});
