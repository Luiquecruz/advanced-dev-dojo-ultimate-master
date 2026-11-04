ADR = {
    "id": 12,
    "title": "Evaluate fraud rules on asyncio workers with bounded fan-out and a process pool",
    "status": "accepted",
    "context": (
        "The fleet must decide 2 000 events/s at peak, each within a 250 ms decision deadline of which at most "
        "100 ms may be spent queueing, and survive the loss of one worker. Each event runs 36 I/O-bound rules "
        "(one feature-store call, mean 15 ms, p95 40 ms) and 4 CPU-bound rules of 2 ms. A load test measured "
        "400 events/s per worker with CPU rules in a process pool and 90 events/s with them on the event loop, "
        "and the feature store allows 300 connections per worker. Rules come from 6 teams and outside authors "
        "who must not inherit from an engine class; 2% of rule evaluations fail or time out, failures must not "
        "drop the event, and shutdown must drain within 15 s."
    ),
    "decision": (
        "We will run each worker as an asyncio engine that fans the rules of an event out in a TaskGroup under a "
        "per-event and a shared global semaphore, bounds intake with an asyncio.Queue, sends CPU rules to a "
        "process pool, discovers Protocol-based rules through entry points, and fails open with a timed_out flag "
        "and an ExceptionGroup of tagged rule failures."
    ),
    "alternatives": [
        {
            "option": "Run the CPU rules on the event loop",
            "reason": "The load test measured 90 events/s per worker that way, which would need 24 workers instead of 6.",
        },
        {
            "option": "One thread per rule call",
            "reason": "14 400 feature-store calls per second per worker as threads costs far more memory and switching than awaiting them.",
        },
        {
            "option": "Rules as subclasses of an engine base class",
            "reason": "Outside rule authors must not inherit from an engine class, so the contract has to be structural.",
        },
    ],
    "consequences": {
        "positive": [
            "Six workers serve the 2 000 events/s peak even after losing one, at 400 events/s each.",
            "A slow or failing rule never drops an event; operators get every failure of one evaluation together.",
            "New rules ship as separate distributions without editing or redeploying the engine code.",
        ],
        "negative": [
            "Every rule and event crosses a process boundary for the CPU checks, so payloads must be picklable.",
            "Entry points load code from any installed distribution, so the rule packages must be pinned and reviewed.",
            "A timed-out decision is incomplete by design and downstream systems must handle the flag.",
        ],
    },
}

PLAN = {
    # (6 - 1) workers x 400 events/s = 2 000 events/s with one worker lost
    "deployment": {"workers": 6, "events_per_worker": 400},
    "concurrency": {
        "model": "asyncio",
        "fanout": "task_group",
        # ceil(36 / 12) = 3 waves x 40 ms + 8 ms = 128 ms <= 150 ms
        "per_event_limit": 12,
        # 400 events/s x 36 calls x 0.015 s = 216 calls in flight, under the 300-connection cap
        "global_limit": 216,
        # 400 events/s x 0.1 s queue budget
        "queue_maxsize": 40,
    },
    # 400 x 4 x 0.002 s = 3.2 CPU-seconds per second
    "cpu_rules": {"where": "process_pool", "pool_size": 4},
    "rule_interface": {"kind": "protocol", "discovery": "entry_points"},
    # 250 ms decision deadline - 100 ms queue budget
    "deadline": {"per_event_ms": 150, "on_timeout": "fail_open_with_flag"},
    "shutdown_deadline_s": 15,
    "rejected": [
        {
            "option": "asyncio.gather without a limit",
            "reason": "Unbounded fan-out would open far more than the 300 feature-store connections a worker may hold.",
        },
        {
            "option": "drop the event on timeout",
            "reason": "A rule failure or timeout must not drop the event; the decision keeps the verdicts that finished.",
        },
    ],
}
