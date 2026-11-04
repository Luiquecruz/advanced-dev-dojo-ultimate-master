# Checkpoint: the Functions ADR

This module answered one question from several sides: where should behavior that cuts across many calls live? A decorator is a function that takes a function and returns a wrapper; a decorator factory takes configuration first and returns the decorator; the wrapper keeps what the factory received in its closure; `functools.wraps` copies the name, the docstring and `__wrapped__`, so traces still name the real operation. The order of a stack *is* the nesting, read outermost first, and every position changes what the program does.

Lesson 10 built such a stack in code. This checkpoint records the **decision** behind one for an SDK that many teams share: an **Architecture Decision Record** plus a **plan** whose numbers come from the briefing.

## The decision checklist

1. **Which mechanism?** Decorator factories compose per call site, in any combination, and one builder function fixes the order. Subclasses that override `send` need one class per combination, and the MRO decides their order. Interceptors registered at import time and monkey patching make the order depend on which module was imported first.
2. **Which order?** Turn each requirement into an "outside" relation, then read off the stack. A layer sees everything inside it: a metrics layer outside the cache measures hits, a cache outside the retry layer skips it on a hit, a rate limiter inside the retry layer counts every attempt.
3. **Where does state live?** In what the factory receives and the wrapper closes over: the store, the metrics sink, the token source. A module-level dict or a class attribute is shared by every client in the process.
4. **Where does time come from?** An injected clock (and an injected sleep) makes tests deterministic and lets them run side by side. Patching `time.monotonic` changes the time for every test running in the process.
5. **What is retried?** Transient errors only. An expired token belongs to the auth layer: retrying it with the same token wastes attempts.
6. **What does one call cost in the worst case?** This number decides how many attempts fit the callers' deadline.
7. **Rejected options.** At least two, each with the fact that ruled it out.

## Layers multiply

A layer that may call its inner function more than once multiplies everything inside it, so the worst case depends on the order. Count each layer's repeats from the outside in, and assume every request takes its full timeout:

```py
attempts, timeout, wait, refresh = 3, 2.0, 0.5, 1.0

# auth outside retry: the auth layer runs the retry layer at most twice, with one refresh between
requests = 2 * attempts                                    # 6
one_run = attempts * timeout + (attempts - 1) * wait       # 7.0 s
worst = 2 * one_run + refresh                              # 15.0 s

# retry outside auth: every attempt may refresh and resend
per_attempt = 2 * timeout + refresh                        # 5.0 s
worst_inverted = attempts * per_attempt + (attempts - 1) * wait   # 16.0 s, and up to 3 refreshes
```

Same layers, same settings, different worst case and a different number of refreshes per call. Order first, then arithmetic.

## Coherence is the point

A plan that measures inside the cache cannot show the latency callers get from hits. A plan with the rate limiter outside the retry layer lets retries spend quota it never counted. A plan that picks the attempt count without the worst-case sum misses the deadline the first time the provider is slow. The tests check these relationships, and the worst case is a number you compute.

## Example: a payments SDK

Here cache hits must stay out of the dashboard and the token service allows a refresh per attempt, so the cache is outermost and the retry layer sits outside auth. The deadline is 20 s.

```py
PLAN = {
    "mechanism": "decorators",
    "order": ["cache", "metrics", "retry", "auth", "rate_limit"],   # outermost first
    "metadata_preserved": True,
    "time_source": "injected_clock",
    "state_location": "closure",
    "retried_errors": "transient_only",
    "retry_attempts": 3,
    "max_requests_per_call": 6,
    "worst_case_latency_s": 3 * (2 * 2.0 + 1.0) + 2 * 0.5,          # 16.0 s; 4 attempts would take 21.5 s
    "rejected": [{"pattern": "a shared module-level cache", "reason": "Two clients in one process would read each other's entries."}],
}
```

Change one requirement (the dashboard must include hits, or one refresh per client call) and the order, the worst case and the attempt budget all change with it. That is what the ADR records.
