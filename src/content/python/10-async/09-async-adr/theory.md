# Checkpoint: the Async ADR

This module answered three questions. **What runs concurrently?** Tasks on one event loop, switching at `await`; a coroutine does nothing until it is awaited or scheduled. **What blocks everyone?** Any call that does not yield, including CPU work, which needs a process (or interpreter) pool on a GIL build. **Who owns cancellation?** The structure that started the work: a `TaskGroup` cancels its siblings, `asyncio.timeout` cancels its block, shutdown drains a bounded queue, and nobody swallows `CancelledError`.

The checkpoint turns those mechanisms into the concurrency design of one service instance: an **Architecture Decision Record** plus a **plan** whose numbers are derived from the briefing.

## The decision checklist

1. **Where does the waiting happen?** Calls that wait on the network belong on the event loop: thousands of pending calls cost a few kilobytes each, not a thread each.
2. **How many calls are in flight?** **Little's law**: in a steady state, the average number of items in a system equals the arrival rate times the average time each spends there, `L = λ × W`. A concurrency cap below `L` cannot sustain the load; a cap far above it only lets slow periods pile up.
3. **What does the quota allow?** At mean latency `W`, `C` concurrent calls produce `C / W` requests per second. A quota of `Q` requests per second therefore caps `C` at `Q × W`.
4. **How big may the queue grow?** A queue that drains at `r` items per second and must not keep an item longer than `t` seconds holds at most `r × t` items. A bound is also the backpressure: when it is full, the reader slows down.
5. **Where does CPU work run?** On a GIL build, pure-Python CPU work runs one thread at a time. Required CPU-seconds per second divided by the utilization target gives the minimum pool size; the cores left by the event loop give the maximum.
6. **How do failures and slow calls surface?** A task group plus `except*` reports every failure; a per-call timeout keeps a slow dependency from holding concurrency slots; nothing is caught and forgotten.
7. **How does it stop?** Stop reading, drain the bounded queue, cancel what is left at a deadline.

## Coherence is the point

A cap of 20 when 40 calls are in flight on average builds an ever-growing backlog. A queue sized "generously" makes every event stale under load. A thread pool for pure-Python CPU work on a GIL build adds threads without adding cores. The tests check these relationships, and the in-flight estimate is a number you compute.

```py
import math

rate, calls, latency = 300, 3, 0.050          # events/s, calls per event, mean seconds
in_flight = rate * calls * latency            # 45.0 calls in flight on average
quota_cap = 1_000 * latency                   # a 1 000 req/s quota allows 50 at mean latency
max_queue = rate * 2.0                        # staleness budget of 2 s: at most 600 events
pool = math.ceil(rate * 0.004 / 0.75)         # 1.2 CPU-s/s at a 75% target: at least 2 workers
```

## Example: a webhook relay

```py
PLAN = {
    "io_model": "asyncio",
    "fanout": "task_group",
    "expected_in_flight": 300 * 3 * 0.050,    # 45.0
    "concurrency_limit": 48,                  # between 45 and the quota's 50
    "backpressure": "bounded_queue",
    "queue_maxsize": 450,                     # 1.5 s of work, inside the 2 s budget
    "cpu_work": "process_pool",
    "cpu_pool_size": 2,
    "timeouts": "per_call",
    "failure_handling": "exception_group",
    "shutdown": "drain_with_deadline",
    "shutdown_deadline_s": 20,
    "rejected": [{"pattern": "gather without a limit", "reason": "Fan-out grows with traffic until the quota is exceeded."}],
}
```

With a quota of 800 requests per second, this relay would be incoherent: 0.050 × 800 = 40 concurrent calls cannot carry 45 in flight, so the ADR would have to change the design (fewer calls per event, a cache, a bigger quota) instead of picking a number.
