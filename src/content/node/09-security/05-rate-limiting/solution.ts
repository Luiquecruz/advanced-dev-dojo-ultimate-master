import { Hono, type Context } from 'hono';
import { createMiddleware } from 'hono/factory';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimiter {
  consume(key: string): RateLimitResult;
}

export class FixedWindowLimiter implements RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  consume(key: string): RateLimitResult {
    const now = this.now();
    const start = Math.floor(now / this.windowMs) * this.windowMs;
    const current = this.windows.get(key);
    const window = current && current.start === start ? current : { start, count: 0 };
    this.windows.set(key, window);
    if (window.count >= this.limit) {
      return { allowed: false, remaining: 0, retryAfterMs: start + this.windowMs - now };
    }
    window.count++;
    return { allowed: true, remaining: this.limit - window.count, retryAfterMs: 0 };
  }
}

export class TokenBucketLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly now: () => number;

  constructor({ capacity, refillPerSecond, now = Date.now }: { capacity: number; refillPerSecond: number; now?: () => number }) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
  }

  consume(key: string): RateLimitResult {
    const now = this.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((now - bucket.updatedAt) * this.refillPerSecond) / 1000);
    bucket.updatedAt = now;
    this.buckets.set(key, bucket);
    if (bucket.tokens < 1) {
      return { allowed: false, remaining: 0, retryAfterMs: Math.ceil(((1 - bucket.tokens) * 1000) / this.refillPerSecond) };
    }
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
  }
}

export function rateLimit(limiter: RateLimiter, keyOf: (c: Context) => string) {
  return createMiddleware(async (c, next) => {
    const result = limiter.consume(keyOf(c));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    if (!result.allowed) {
      c.header('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
      return c.json({ error: 'Too many requests' }, 429);
    }
    await next();
  });
}

export function createApp(limiter: RateLimiter) {
  const app = new Hono();
  app.get('/health', (c) => c.json({ status: 'ok' }));
  app.use('/api/*', rateLimit(limiter, (c) => c.req.header('X-Api-Key') ?? 'anonymous'));
  app.get('/api/data', (c) => c.json({ ok: true }));
  return app;
}

async function main() {
  const app = createApp(new TokenBucketLimiter({ capacity: 3, refillPerSecond: 1 }));
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await app.request('/api/data', { headers: { 'X-Api-Key': 'demo' } });
    console.log(attempt, response.status, response.headers.get('X-RateLimit-Remaining'), response.headers.get('Retry-After'));
  }
}

main();
