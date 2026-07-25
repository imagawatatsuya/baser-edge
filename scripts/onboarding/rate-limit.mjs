const buckets = new Map();

function purgeExpired(now) {
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

/**
 * @param {string} key e.g. client IP + route
 * @param {{ limit?: number, windowMs?: number }} options
 */
export function checkRateLimit(key, options = {}) {
  const limit = Number(process.env.BASER_ONBOARDING_RATE_LIMIT_PER_MIN ?? options.limit ?? 30);
  const windowMs = Number(process.env.BASER_ONBOARDING_RATE_LIMIT_WINDOW_MS ?? options.windowMs ?? 60_000);
  const now = Date.now();
  purgeExpired(now);
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > limit) {
    const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}
