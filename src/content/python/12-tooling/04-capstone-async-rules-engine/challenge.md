The track's last challenge combines dataclasses, protocols, exception groups and notes, task groups, semaphores, timeouts and queues. Budget **60 to 90 minutes**. You build the engine in `main.py`, then record how to deploy it in `adr.py`. `demo.py` drives the engine with your plan's numbers.

## Briefing

All numbers describe the production system. Capacity is stated **per worker process**.

- A payments platform evaluates fraud and compliance rules on a fleet peak of **2 000 events/s**.
- **40 rules** written by 6 teams: **36 I/O-bound** rules (one feature-store call each, mean **15 ms**, p95 **40 ms**) and **4 CPU-bound** rules (**2 ms** each). Budget **8 ms** per event for the four CPU checks, since they can queue behind each other in the pool.
- A load test of this asyncio engine measured that **one worker sustains 400 events/s** when the CPU rules run in a process pool, and **90 events/s** when they run on the event loop. The workers run the default CPython build, with the GIL, so threads (`asyncio.to_thread`) execute the CPU rules' Python code one at a time: at most one CPU-second per second. Size every per-worker limit for a worker running at its measured capacity.
- The feature store allows **300 concurrent connections per worker**.
- Each event has a **250 ms** decision deadline, of which at most **100 ms** may be spent waiting in the worker's queue. The engine's own deadline starts when a worker takes the event from the queue.
- The fleet must survive the loss of **one worker** at peak.
- Rules are plugins added without editing the engine. Outside authors must not inherit from an engine base class.
- **2%** of rule evaluations fail or time out. A rule failure must not drop the event, a timed-out evaluation must be visible in its decision, and operators need every failure of one evaluation reported together, each tagged with its rule name.
- Shutdown must drain in-flight events within **15 s**.

## Part 1: the engine (`main.py`)

Given: the protocols `AsyncRule` (`name: str`, `async def evaluate(self, event) -> bool`) and `CpuRule` (`name: str`, `def check(self, event) -> bool`), both `@runtime_checkable`, and the frozen dataclass `Decision(event_id, flags, errors, timed_out)`. `True` from a rule means it flags the event. Rules are plain classes: nothing inherits from an engine class.

### `validate_event(event)`

Return the event when it is a `dict` with a non-empty string `"id"`; otherwise raise `ValueError`.

### `async evaluate_event(event, rules, *, per_event_limit, deadline_s, offload, global_slots=None)`

- Run every rule concurrently in an `asyncio.TaskGroup`, never more than `per_event_limit` at once (an `asyncio.Semaphore`). When the engine passes `global_slots` (a shared `Semaphore`), each rule also holds one of its slots while it runs.
- Await `offload(rule.check, event)` for CPU rules. Never call `check` directly: in production `offload` sends it to a process pool.
- An `Exception` raised by a rule gets the note `rule=<name>` (`add_note`) and is collected; the other rules keep running. `asyncio.CancelledError` must never be swallowed.
- The whole evaluation runs inside `asyncio.timeout(deadline_s)`. On timeout the decision keeps the flags of the rules that already finished and sets `timed_out=True`; unfinished rules are cancelled.
- Return `Decision(event_id=event["id"], flags=<sorted tuple of flagging rule names>, errors=ExceptionGroup("rule failures", collected) or None, timed_out=...)`.

### `class Engine(rules, *, queue_maxsize, workers, per_event_limit, global_limit, deadline_s, offload, on_decision)`

- The constructor raises `TypeError` for any rule that satisfies neither protocol, and creates one `asyncio.Queue(maxsize=queue_maxsize)` and one `asyncio.Semaphore(global_limit)` shared by every event.
- `async start()` launches `workers` consumer tasks. Each takes an event, evaluates it with `evaluate_event` (passing the shared semaphore as `global_slots`) and calls `on_decision(decision)`, a plain function.
- `async submit(event)` validates the event (`ValueError`), raises `RuntimeError` once shutdown has begun, and otherwise awaits the queue's `put`: a full queue makes the caller wait, which is the backpressure.
- `async shutdown(drain_s)` stops intake, lets queued and in-flight events finish within `drain_s` seconds, cancels whatever is left, and returns the number of events decided during the drain.

Learner code never calls `asyncio.run`: the tests await your coroutines, and only `demo.py` uses `asyncio.run`.

## Part 2: the record (`adr.py`)

**`ADR`**: `id` (positive integer), `title` (at least 10 characters), `status: "accepted"`, `context` (at least 80 characters, naming the fleet peak and the decision deadline), `decision` (at least 40 characters, starting with `We will`), at least two `alternatives` (`option` of at least 3 characters, distinct, `reason` of at least 20 characters), and `consequences` with non-empty `positive` and `negative` lists (items of at least 15 characters).

**`PLAN`**:

- `deployment`: `{"workers": int, "events_per_worker": int}`: the fleet size and the peak load each worker is planned for.
- `concurrency`: `{"model": "asyncio" | "threads" | "processes", "fanout": "task_group" | "gather" | "unbounded_tasks", "per_event_limit": int, "global_limit": int, "queue_maxsize": int}`.
- `cpu_rules`: `{"where": "process_pool" | "event_loop" | "to_thread", "pool_size": int}`.
- `rule_interface`: `{"kind": "protocol" | "abc" | "concrete_base", "discovery": "init_subclass" | "entry_points" | "manual_list"}`.
- `deadline`: `{"per_event_ms": int, "on_timeout": "skip_rule" | "drop_event" | "fail_open_with_flag"}`. `per_event_ms` is the engine's `deadline_s` in milliseconds.
- `shutdown_deadline_s`: int.
- `rejected`: at least two `{"option", "reason"}` with distinct options and reasons of at least 20 characters.

The tests check that the numbers fit the briefing, so compute them:

1. No worker is planned above its measured capacity, and the fleet still serves the peak with one worker lost.
2. `global_limit` holds the feature-store calls one worker has in flight at its measured capacity, within the connection cap.
3. One event's 36 calls run in waves of `per_event_limit`. At p95 call time plus the CPU budget, the waves must fit what is left of the decision deadline after the queue budget, and `per_event_limit` cannot exceed `global_limit`.
4. `per_event_ms` covers that p95 evaluation time and fits the same budget.
5. `queue_maxsize` keeps an event's wait in the queue within the queue budget at the worker's capacity.
6. `pool_size` gives the CPU rules enough processes for the CPU-seconds they need each second.
7. `shutdown_deadline_s` respects the drain requirement.
8. Every categorical choice must be coherent with the measurements, the plugin authors and the failure requirements.
