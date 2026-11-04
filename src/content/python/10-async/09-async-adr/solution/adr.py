ADR = {
    "id": 10,
    "title": "Run event enrichment on asyncio with bounded fan-out and a process pool for signatures",
    "status": "accepted",
    "context": (
        "One ingestion instance reads up to 1 200 events/s; each event needs 2 enrichment calls (mean 20 ms, p95 80 ms, "
        "5% failures) against a quota of 3 000 requests/s, so about 48 calls are in flight on average and at most 60 fit "
        "the quota at mean latency. Each event also costs 1 ms of pure-Python CPU for its signature: 1.2 CPU-seconds per "
        "second on a GIL build with 4 vCPUs, one kept by the event loop. Events older than 500 ms are stale, failures must "
        "be reported per event, and shutdown must drain within 10 s."
    ),
    "decision": (
        "We will run the enrichment calls on one asyncio event loop, two calls per event in a task group, capped at 56 "
        "concurrent calls by a semaphore with a per-call timeout, feed events through a bounded queue of 480, verify "
        "signatures in a process pool of 2 workers, handle failures with except* and dead-letter them, and drain the "
        "queue with an 8 s deadline on shutdown."
    ),
    "alternatives": [
        {
            "option": "Thread pool for the enrichment calls",
            "reason": "About 48 calls wait at once on I/O; one event loop serves them without 48 threads and their memory.",
        },
        {
            "option": "Signature checks on the event loop",
            "reason": "1 200 checks of 1 ms need 1.2 CPU-seconds per second, more than the loop's only thread can give.",
        },
        {
            "option": "Signature checks with asyncio.to_thread",
            "reason": "The check is pure Python on a GIL build, so threads cannot run two checks in parallel.",
        },
    ],
    "consequences": {
        "positive": [
            "Enrichment throughput fits the quota: at most 56 calls of 20 ms is about 2 800 requests/s.",
            "A full queue of 480 events drains in 0.4 s, so no queued event becomes stale.",
        ],
        "negative": [
            "Events and signatures are pickled to the process pool, which adds latency and a serialization contract.",
            "A latency spike towards the p95 of 80 ms fills the queue and slows the broker reads by design.",
        ],
    },
}

PLAN = {
    "io_model": "asyncio",
    "fanout": "task_group",
    "expected_in_flight": 1_200 * 2 * 0.020,
    "concurrency_limit": 56,
    "backpressure": "bounded_queue",
    "queue_maxsize": 480,
    "cpu_work": "process_pool",
    "cpu_pool_size": 2,
    "timeouts": "per_call",
    "failure_handling": "exception_group",
    "shutdown": "drain_with_deadline",
    "shutdown_deadline_s": 8,
    "rejected": [
        {
            "pattern": "one unbounded task per enrichment call",
            "reason": "At p95 latency the in-flight calls would grow past the 60 that the quota allows.",
        },
        {
            "pattern": "unbounded local buffer",
            "reason": "When enrichment slows down, events would wait longer than 500 ms and pile up in memory.",
        },
        {
            "pattern": "except Exception around each event that logs and continues",
            "reason": "Failures would disappear from the dead-letter flow and cancellations could be swallowed.",
        },
    ],
}
