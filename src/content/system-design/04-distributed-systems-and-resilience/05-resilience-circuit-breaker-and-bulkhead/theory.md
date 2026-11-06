# Resilience: Circuit Breakers, Retries & Bulkheads

In a system of many services, something is always slow or broken. Resilience is not about preventing those failures; it is about stopping one failing dependency from taking everything else down with it. This lesson covers the tools for that, in the order you apply them: timeouts, careful retries with backoff and jitter, circuit breakers, bulkheads, and load shedding with fallbacks.

You need: Client-Server Architecture & HTTP Basics (idempotent methods, 5xx and 503), Message Queues & Event Streams (retries and dead-letter queues) and Saga Pattern & Transactional Outbox (idempotency keys).

## Cascading failures start with waiting

Imagine a checkout service that calls a recommendations service. Recommendations becomes slow: answers take 30 seconds instead of 50 ms. Checkout keeps sending requests, each one holds a thread or a connection while it waits, and soon checkout has no free workers left. Now checkout is down too, and so is every service that calls checkout. A slow dependency is often worse than a dead one, because a dead one fails fast.

This chain is a **cascading failure**. The first defense is a **timeout** on every remote call, set from the dependency's normal latency (for example a little above its p99, the latency that 99% of its requests stay under), so a stuck call releases its worker instead of waiting forever. A timeout turns "slow" into "failed", which the next tools can handle.

## Retries: only for transient, idempotent failures

Many failures are **transient**: a dropped connection, a `503 Service Unavailable` during a deploy, a timeout on one overloaded instance. A retry often succeeds. Two rules decide whether to retry at all:

- **Retry transient errors only.** A `400 Bad Request` or `404` will fail the same way again; a `503`, a `429` with `Retry-After` or a connection reset may not.
- **Retry idempotent operations only**, or make them idempotent with an idempotency key. Retrying a non-idempotent `POST` after a timeout can charge a card twice.

### Exponential backoff with a cap

Retrying immediately hits a dependency at the moment it is least able to answer. **Exponential backoff** waits longer after each failure, `base * 2^attempt`, so an overloaded service gets room to recover. A **cap** bounds the wait, so attempt 20 does not sleep for hours. Limit the number of attempts too, and give up with an error after them.

### Jitter

Backoff alone still synchronizes clients. If 10,000 clients fail at the same instant, they all retry after exactly 100 ms, then all after 200 ms: each wave is a spike as large as the original one. **Jitter** randomizes the delay so retries spread over time. With **full jitter** the delay is a random value between zero and the backoff:

```text
delay = floor(random() * min(cap, base * 2^attempt))
```

### Retry budgets

Retries multiply load. If each of three layers makes up to three attempts, one user request can become 27 calls to the bottom service, exactly when it is struggling. A **retry budget** limits retries to a fraction of normal traffic (for example, retries may add at most 10% to the request rate). Together with retrying at one layer only, it keeps retries from turning an outage into a storm.

## Circuit breakers: stop calling what is broken

When a dependency is clearly down, even well-spaced retries waste time and resources. A **circuit breaker** wraps calls to one dependency and has three states:

| State | Behavior | Leaves when |
| --- | --- | --- |
| **closed** | calls pass through; failures are counted (consecutive ones, or a failure rate over a recent window) | failures reach the **threshold** → open |
| **open** | calls **fail fast** without touching the dependency | the **open period** has passed → half-open |
| **half-open** | a **few trial requests** (often just one) pass, other calls still fail fast | trial succeeds → closed (counter reset); trial fails → open again |

Failing fast frees the caller's workers immediately and gives the dependency time to recover without traffic. The half-open trial checks recovery with a small sample instead of releasing the full load at once. The open error is also a clear signal for the caller: serve a **fallback** (cached recommendations, a default value, "try again later") instead of waiting.

## Bulkheads: isolate the pools

A ship's hull is split into watertight compartments, so one breach floods one compartment. A **bulkhead** in software gives each dependency its **own** limited pool: a connection pool, a thread pool or a concurrency limit. If recommendations hangs, it exhausts its own 20 connections while payments keeps its separate pool and still works. Without bulkheads, every dependency shares one pool and the slowest one decides how many workers are left for everybody.

## Load shedding and fallbacks

When a service is overloaded itself, accepting every request makes every request slow. **Load shedding** rejects the excess early, with `503` or `429` and a `Retry-After`, so the requests it does accept still finish within their deadline. Shed the least important traffic first (prefetches, analytics) before user-facing requests. **Fallbacks** decide what the caller shows when a dependency is unavailable; a degraded page is better than an error page.

## Common mistakes

- **Immediate retries without backoff or jitter.** Every client retries at the same instant, so the dependency sees spikes as large as the original load, again and again, and never recovers. Back off exponentially, cap the delay and add full jitter.
- **No timeout on remote calls**, so a slow dependency holds every worker and the failure cascades.
- **Retrying non-idempotent or permanent errors**: a second charge, or ten identical `400` responses.
- **One shared pool for all dependencies**, so the slowest dependency starves the healthy ones.

## In practice

For every remote call, write down four values: the timeout, which errors are retried and how many times, the circuit breaker threshold and open period, and the fallback. Retry at one layer only, and watch how often each breaker opens: an open breaker is an alert that a dependency is in trouble, not a fix for it.

## Check yourself

1. A dependency becomes slow rather than dead. Why can that take down its callers, and which two tools stop it?
2. Why does exponential backoff still produce spikes without jitter?
3. A circuit breaker is half-open and a trial request fails. What happens next, and why does half-open let only a few trial requests through?
