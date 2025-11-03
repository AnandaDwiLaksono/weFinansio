type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

// Clean up old buckets periodically to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const maxAge = 3600 * 1000; // 1 hour
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        buckets.delete(key);
      }
    }
  }, 600000); // Clean up every 10 minutes
}

export function tokenBucketAllow({
  key,
  capacity = 10,         // maksimum permintaan
  refillRate = 1,        // token per detik
}: { key: string; capacity?: number; refillRate?: number }) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, lastRefill: now };
  // refill
  const elapsed = (now - b.lastRefill) / 1000;
  const refill = Math.floor(elapsed * refillRate);
  if (refill > 0) {
    b.tokens = Math.min(capacity, b.tokens + refill);
    b.lastRefill = now;
  }
  if (b.tokens > 0) {
    b.tokens -= 1;
    buckets.set(key, b);
    return true;
  }
  return false;
}
