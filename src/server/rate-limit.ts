import 'server-only';

type Bucket = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  read(key: string): Bucket | undefined;
  write(key: string, bucket: Bucket): void;
};

class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  read(key: string) {
    return this.buckets.get(key);
  }

  write(key: string, bucket: Bucket) {
    this.buckets.set(key, bucket);
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

export function setRateLimitStore(nextStore: RateLimitStore) {
  store = nextStore;
}

export function checkRateLimit({
  key,
  limit,
  windowMs
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const current = store.read(key);

  if (!current || current.resetAt <= now) {
    store.write(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { ok: false as const, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  return {
    ok: true as const,
    remaining: limit - current.count,
    resetAt: current.resetAt
  };
}
