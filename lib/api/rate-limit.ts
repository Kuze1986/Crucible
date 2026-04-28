type Bucket = {
  count: number;
  resetAt: number;
};

const inMemoryBuckets = new Map<string, Bucket>();

export function checkRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}): { ok: boolean; remaining: number; resetAt: number } {
  const now = input.now ?? Date.now();
  const existing = inMemoryBuckets.get(input.key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + input.windowMs;
    inMemoryBuckets.set(input.key, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(input.limit - 1, 0), resetAt };
  }

  existing.count += 1;
  inMemoryBuckets.set(input.key, existing);

  const ok = existing.count <= input.limit;
  const remaining = Math.max(input.limit - existing.count, 0);
  return { ok, remaining, resetAt: existing.resetAt };
}
