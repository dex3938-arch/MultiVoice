/**
 * Small in-memory limiter (per server instance; login failures are also counted in the database).
 * Login: 5 tries per IP+email per 15 minutes. Webhooks: callers with a wrong secret are slowed down.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 10_000;

export function hit(key: string, limit = 5, windowMs = 15 * 60_000) {
  const now = Date.now();
  if (buckets.size > MAX_KEYS) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  b.count++;
  return { ok: b.count <= limit, retryAfterMs: b.resetAt - now };
}

/** Has this address sent too many requests with a wrong secret? (checked before the secret itself) */
export function blocked(ip: string) {
  const b = buckets.get(`bad:${ip}`);
  return Boolean(b && b.resetAt > Date.now() && b.count >= 20);
}

/** Count a request with a wrong secret / signature: 20 in 10 minutes → that address is refused for the rest of the window. */
export const badSecret = (ip: string) => hit(`bad:${ip}`, 20, 10 * 60_000);

export const requestIp = (h: Headers) => h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
