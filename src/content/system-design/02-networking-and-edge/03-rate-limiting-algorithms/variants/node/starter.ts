interface TokenBucketOptions {
  capacity: number;
  refillPerSecond: number;
  now: () => number;
}

interface SlidingWindowOptions {
  limit: number;
  windowMs: number;
  now: () => number;
}

export function createTokenBucket({ capacity, refillPerSecond, now }: TokenBucketOptions) {
  let tokens = capacity;
  let last = now();

  function refill(): void {
    // TODO: add the tokens earned since `last`, capped at the capacity, and move `last` to now
  }

  function tryRemove(requested = 1): boolean {
    refill();
    if (tokens < requested) {
      return false;
    }
    tokens -= requested;
    return true;
  }

  function available(): number {
    refill();
    return tokens;
  }

  return { tryRemove, available };
}

export function createSlidingWindowCounter({ limit, windowMs, now }: SlidingWindowOptions) {
  let windowStart = Math.floor(now() / windowMs) * windowMs;
  let current = 0;

  function allow(): boolean {
    const start = Math.floor(now() / windowMs) * windowMs;
    if (start !== windowStart) {
      windowStart = start;
      current = 0;
    }
    // TODO: keep the previous window's count and weight it by the part of it that still overlaps the sliding window
    if (current >= limit) {
      return false;
    }
    current += 1;
    return true;
  }

  return { allow };
}

let clock = 0;
const bucket = createTokenBucket({ capacity: 3, refillPerSecond: 1, now: () => clock });
console.log([1, 2, 3, 4].map(() => bucket.tryRemove()));
clock = 2_000;
console.log(bucket.available());

const limiter = createSlidingWindowCounter({ limit: 2, windowMs: 1_000, now: () => clock });
console.log([1, 2, 3].map(() => limiter.allow()));
