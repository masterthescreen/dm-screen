// Small in-memory login throttle. Good for a single server process, which is
// what this app runs as; it resets when the server restarts.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export const LOGIN_MAX_FAILURES = 8;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function prune(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/**
 * Best-effort client address. Prefers Cloudflare's header, then the *last*
 * X-Forwarded-For entry (the one added by the nearest proxy), which a client
 * can't forge the way it can the first entry.
 */
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}

export function checkLimit(key: string): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return { limited: false, retryAfterSec: 0 };
  return { limited: b.count >= LOGIN_MAX_FAILURES, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

export function recordFailure(key: string) {
  const now = Date.now();
  prune(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  else b.count += 1;
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

// ---------- Generic "N per window" limiter (used for outbound lookups) ----------

const hits = new Map<string, number[]>();

/** Allows up to `max` calls per `windowMs` for `key`. Returns how long to wait if over. */
export function takeToken(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}
