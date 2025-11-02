type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

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
