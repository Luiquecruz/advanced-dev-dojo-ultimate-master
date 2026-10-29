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
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor({ limit, windowMs, now = Date.now }: { limit: number; windowMs: number; now?: () => number }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  consume(key: string): RateLimitResult {
    // TODO: count requests per key in windows aligned to multiples of windowMs and block once the limit is reached
    return { allowed: true, remaining: this.limit, retryAfterMs: 0 };
  }
}

export class TokenBucketLimiter implements RateLimiter {
  private readonly capacity: number;
  private readonly refillPerSecond: number;
  private readonly now: () => number;

  constructor({ capacity, refillPerSecond, now = Date.now }: { capacity: number; refillPerSecond: number; now?: () => number }) {
    this.capacity = capacity;
    this.refillPerSecond = refillPerSecond;
    this.now = now;
  }

  consume(key: string): RateLimitResult {
    // TODO: refill the key's bucket from the elapsed time (up to capacity), then take one token or report when the next one arrives
    return { allowed: true, remaining: this.capacity, retryAfterMs: 0 };
  }
}

export function rateLimit(limiter: RateLimiter, keyOf: (c: Context) => string) {
  return createMiddleware(async (c, next) => {
    // TODO: consume a token for keyOf(c), set X-RateLimit-Remaining, answer 429 with Retry-After when blocked
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
