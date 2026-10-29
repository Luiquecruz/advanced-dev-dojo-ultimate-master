# Rate Limiting

Every public endpoint is eventually called faster than you planned: a buggy `useEffect` loop, a scraper, credential stuffing on `/login`, someone testing your AI endpoint with your token budget. A rate limiter caps how often a key (user, API key, IP) may call you, protecting availability, cost and accounts.

## Where limits apply

| Layer | Example | Good for |
| --- | --- | --- |
| Edge / gateway | Cloudflare, AWS API Gateway, nginx `limit_req` | volumetric abuse, per-IP floods, before your code runs |
| Application middleware | Hono or Express middleware | per-user and per-plan limits, business-aware keys |
| Specific operations | login attempts per account, password reset per email, AI calls per day | abuse that a global limit misses |

Use more than one: the edge stops floods cheaply, the application knows who the user is.

## The algorithms

**Fixed window**: count requests per key in windows aligned to the clock (`floor(now / windowMs)`). One counter per key, trivially implemented in Redis with `INCR` and `EXPIRE`. Weakness: a client can send `limit` requests at 10:00:59.9 and `limit` more at 10:01:00.0, twice the rate for a moment.

**Sliding window**: keep the previous window's count and weight it by the overlap (`previous * (1 - elapsed / windowMs) + current`). Nearly as cheap, much smoother; many production limiters use it.

**Sliding log**: store each request timestamp and count those in the last `windowMs`. Exact but memory grows with traffic.

**Token bucket**: each key has a bucket of `capacity` tokens that refills at `rate` per second; a request takes a token or is rejected. It allows short bursts (a page load firing 10 requests) while enforcing a steady average. Refill lazily from elapsed time, no timers needed:

```ts
bucket.tokens = Math.min(capacity, bucket.tokens + (now - bucket.updatedAt) * ratePerSecond / 1000);
bucket.updatedAt = now;
if (bucket.tokens >= 1) {
  bucket.tokens -= 1;
} else {
  retryAfterMs = Math.ceil((1 - bucket.tokens) * 1000 / ratePerSecond);
}
```

The **leaky bucket** is the mirror image: requests queue and drain at a fixed rate, smoothing traffic toward a fragile upstream.

## Telling clients

Answer **429 Too Many Requests** with `Retry-After` (seconds). Many APIs also send the remaining budget (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, or the newer IETF `RateLimit` and `RateLimit-Policy` headers). Your frontend should honour `Retry-After` with backoff instead of retrying immediately.

## Choosing the key

- **IP**: works for anonymous traffic, but whole offices and mobile carriers share IPs (NAT), and attackers rotate them. Behind a proxy, read the client IP from the header **your** proxy sets, configured as trusted; a raw `X-Forwarded-For` from the client is spoofable.
- **User id or API key**: fair and precise after authentication; enables per-plan limits.
- **Account under attack**: for login, limit per target email as well as per IP, so distributed credential stuffing still hits a wall. Prefer slowing down or adding a CAPTCHA over locking the account, which attackers can abuse to lock users out.

## Many instances

An in-memory `Map` limits each Node process separately: with 4 instances, a limit of 100 becomes 400, and restarts reset it. Production limiters keep counters in Redis (atomic `INCR` with expiry, or a Lua script for token buckets) or use the gateway's built-in limiter. Decide what happens when Redis is unavailable: failing open keeps the API up, failing closed protects expensive operations.

## When to choose it

| Need | Choose |
| --- | --- |
| Simple per-minute quota, cheap to run | fixed window (accept the boundary burst) |
| Smooth limits without bursts at boundaries | sliding window counter |
| Allow bursts, enforce an average (APIs, SDK clients) | token bucket |
| Protect a slow upstream with a steady outflow | leaky bucket or a queue |
| Floods and anonymous abuse | the edge or gateway, before Node.js |

Libraries such as `hono-rate-limiter`, `express-rate-limit` and `rate-limiter-flexible` (with Redis stores) implement these; write your own only to learn or for unusual keys.

## Working with AI

Specify the policy, not just "add rate limiting": the key, the algorithm, the limits per route, the store, and the response. Review checklist:

- Counters live in a shared store when the app runs more than one instance.
- The key cannot be spoofed: the client IP comes from a trusted proxy configuration, not a raw header.
- Sensitive routes (login, reset, signup, AI calls) have their own stricter limits.
- Blocked responses are `429` with `Retry-After`; limits are not applied to health checks.
- Time comes from one clock source, and the behavior when the store is down is a conscious choice.
