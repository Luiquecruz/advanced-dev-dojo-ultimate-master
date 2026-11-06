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
    const time = now();
    tokens = Math.min(capacity, tokens + ((time - last) * refillPerSecond) / 1000);
    last = time;
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
  let previous = 0;

  function allow(): boolean {
    const time = now();
    const start = Math.floor(time / windowMs) * windowMs;
    if (start !== windowStart) {
      previous = start - windowStart === windowMs ? current : 0;
      current = 0;
      windowStart = start;
    }
    const estimate = (previous * (windowMs - (time - start))) / windowMs + current;
    if (estimate >= limit) {
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
