Both limiters need a private `Map` keyed by the client key. The fixed window stores `{ start, count }`; the token bucket stores `{ tokens, updatedAt }`. Read `const now = this.now()` once at the start of `consume`.
---
Fixed window: compute `start`, then reuse the stored window only if `current.start === start`, otherwise start from `{ start, count: 0 }`. When blocked, the window ends at `start + windowMs`, so `retryAfterMs` is `start + this.windowMs - now`.
---
Token bucket: `const bucket = this.buckets.get(key) ?? { tokens: this.capacity, updatedAt: now }`, then `bucket.tokens = Math.min(this.capacity, bucket.tokens + (now - bucket.updatedAt) * this.refillPerSecond / 1000)` and `bucket.updatedAt = now`. In the middleware, call `c.header(...)` before returning `c.json({ error: 'Too many requests' }, 429)` or calling `await next()`.
