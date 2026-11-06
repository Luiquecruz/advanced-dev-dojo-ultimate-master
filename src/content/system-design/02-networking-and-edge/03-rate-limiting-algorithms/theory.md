# Rate Limiting Algorithms

A single client stuck in a retry loop, a scraper or a burst from a misbehaving integration can consume the capacity meant for everyone else. A rate limiter caps how many requests a client may send in a period and rejects the rest early, before they reach expensive servers and databases. This lesson compares the five classic algorithms, shows where each one leaks, and explains how to enforce one limit across many servers without races.

You need: Client-Server Architecture & HTTP Basics (status codes such as `429`), Statelessness & Sessions (state kept in a shared store), Caching Fundamentals (Redis as an in-memory store) and Advanced Load Balancing: Layer 4, Layer 7 & Power of Two Choices (layer 7 proxies that read each request).

## Where the limiter lives

Limits are usually enforced at the edge: in the layer 7 load balancer, in a CDN, or in an **API gateway**, a layer 7 proxy that sits in front of a set of services and handles cross-cutting concerns such as authentication and limits. Each limit has a **key** (user id, API key or IP address), a **budget** (100 requests) and a **period** (per minute). Several limits often stack: a generous per-user limit, a stricter one on login attempts, and a global ceiling that protects the database.

A rejected request receives `429 Too Many Requests`, ideally with a `Retry-After` header saying how long to wait, in seconds or as a date. Well-behaved clients slow down instead of hammering the server; `5xx` would wrongly tell them the server is broken.

## Fixed window

Count requests per key in windows aligned to the clock (`12:00:00`–`12:00:59`, then the next minute) and reset the counter when a window starts. It is one counter per key, cheap and easy to explain.

Its flaw is the **edge spike**. With a limit of 100 per minute, a client can send 100 requests at `12:00:59` and 100 more at `12:01:00`: 200 requests within two seconds, twice the budget of any one-minute span, all accepted.

## Sliding window log

Store the timestamp of every accepted request and, for each new one, drop timestamps older than the window and compare the count with the limit. It is exact, but it keeps one entry per request: a limit of 10,000 per hour costs up to 10,000 timestamps per key.

## Sliding window counter

Keep only two fixed-window counters, the current and the previous one, and estimate the count of the last full window by weighting the previous counter by how much of it still overlaps:

```text
estimate = previous × (window − elapsed) / window + current
```

Twenty seconds into a one-minute window, the last 60 seconds still include 40 seconds of the previous window, so the previous count is weighted by `40 / 60`. Right after the boundary the full previous count still weighs in, so the edge spike is rejected. The estimate assumes the previous window's requests were spread evenly: when they were bunched at its end, it runs low and some extra requests get through over the following minute, though never as one instant burst. That inaccuracy buys constant memory: two counters per key instead of a log of timestamps.

## Token bucket

A bucket holds up to `capacity` tokens and refills at `rate` tokens per second. Each request takes a token; an empty bucket means reject. You do not need a timer: store the token count and the time of the last update, and on each request add `elapsed seconds × rate` tokens, capped at the capacity. The capacity allows **bursts** (a client idle for a while may send `capacity` requests at once) while the refill rate sets the long-term average. Amazon API Gateway throttles with a token bucket.

## Leaky bucket

Requests enter a queue that drains at a constant rate; when the queue is full, new requests are rejected. Output is perfectly smooth, which protects a downstream system that cannot absorb bursts, but requests wait in the queue and a burst of old requests can delay fresh ones.

## Distributed limits

With ten servers each enforcing "100 per minute" in memory, a client spread across them can get up to 1,000. The counters must live in a shared store such as Redis, and each update must be **atomic**. The naive sequence "read the counter, compare, write counter + 1" races: two servers read `99` at the same moment, both allow, both write `100`, and the limit is exceeded. Redis avoids this with atomic commands: `INCR` increments and returns the new value in one step, so each server compares its own result with the limit, and the window's lifetime is set once per window, not on every request (an `EXPIRE` per request keeps pushing the expiry forward). Create the key with its lifetime first (`SET key 0 EX 60 NX` does nothing when the key exists) and then `INCR` it, or do both in one script; an `INCR` followed by a separate `EXPIRE` leaves a counter that never expires if a crash comes between them. When the check needs several steps (a token bucket's refill and take), a **Lua script** runs on the Redis server as one atomic operation that no other command can interleave.

## Common mistakes

- **Fixed window edge spikes.** A client can send a full budget at the end of one window and another at the start of the next, so twice the limit lands within seconds. Use a sliding window counter, or a token bucket whose capacity caps the burst, when bursts matter.
- **Read-then-write counters in a shared store.** Concurrent servers read the same value and all allow; use atomic increments or a script.
- **Limits kept in each server's memory** behind a load balancer, which multiplies the real limit by the number of servers.

## In practice

Use a token bucket when short bursts are acceptable and you want a steady average, a sliding window counter when the limit should read as "N per window" without edge spikes, and a leaky bucket in front of a fragile downstream system. Enforce limits at the edge with a shared, atomic store, answer `429` with `Retry-After`, and expose the remaining budget so clients can pace themselves. Decide in advance what happens when the store is unreachable: general limits usually fail open (allow), so a limiter outage does not take the API down with it, while security limits such as login attempts fail closed.

## Check yourself

1. A limit of 60 per minute uses a fixed window. What is the largest number of requests a client can get accepted within two seconds, and how?
2. A token bucket has capacity 20 and refills 5 tokens per second. A client has been idle for a minute. How many requests can it send at once, and at what rate afterwards?
3. Two API servers check a Redis counter with `GET` and then `SET`. Why can the limit be exceeded, and what fixes it?
