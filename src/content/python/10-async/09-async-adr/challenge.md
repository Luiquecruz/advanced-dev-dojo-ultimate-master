Write the ADR and the plan for the **concurrency design of an ingestion service**.

## Briefing

An ingestion service reads events from a message broker, enriches them and stores them. Every number below describes **one instance** of the service.

- **Rate:** the instance reads up to **1 200 events/s**.
- **Enrichment:** each event needs **2** calls to an enrichment API. Latency: mean **20 ms**, p95 **80 ms**. About **5%** of the calls fail (timeouts and server errors). The API grants this instance a quota of **3 000 requests/s**.
- **CPU:** each event also needs a signature check written in pure Python that costs **1 ms** of CPU. The instance has **4 vCPUs** and runs the standard (GIL) build of CPython 3.14; the event loop process keeps **1** vCPU for itself. A CPU worker pool may run at **70%** utilization at most.
- **Freshness:** an event that waits more than **500 ms** in the instance's local queue is stale. The queue must never hold more work than the instance processes in that time.
- **Failures:** a failed enrichment is reported per event to a dead-letter topic; nothing is dropped silently.
- **Shutdown:** on deploy, the instance stops reading, finishes the events it holds and exits within **10 s**.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `event`s and the `quota`.
- `decision`: at least 40 characters, starts with `We will`, and names the `queue`, the `process` pool and, when you fan out with one, the `task group`.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `io_model`: `"asyncio"`, `"threads"` or `"processes"`, where the enrichment calls wait.
- `fanout`: `"task_group"`, `"gather"` or `"unbounded_tasks"`, how the calls are started.
- `expected_in_flight`: a number, the **average number of enrichment calls in flight**. Compute it with Little's law: arrival rate of calls times mean latency.
- `concurrency_limit`: an integer, the cap on concurrent enrichment calls.
- `backpressure`: `"bounded_queue"` or `"none"`; `queue_maxsize`: an integer.
- `cpu_work`: `"process_pool"`, `"event_loop"` or `"to_thread"`, where the signature checks run; `cpu_pool_size`: an integer.
- `timeouts`: `"per_call"` or `"none"`.
- `failure_handling`: `"exception_group"` (failures surface from the task group and are handled with `except*`) or `"swallow"`.
- `shutdown`: `"drain_with_deadline"` or `"kill"`; `shutdown_deadline_s`: an integer, in seconds.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the numbers rather than from the field names:

1. The in-flight estimate follows from the call rate and the mean latency.
2. The concurrency limit is high enough to sustain the average load and low enough that, at mean latency, the instance stays within its quota.
3. The calls wait on I/O, so they stay where waiting is cheapest, and they are never started without a bound.
4. The local queue is bounded so that a full queue drains before its last event goes stale.
5. The signature checks run where they can use more than one core on a GIL build; the pool is large enough to stay under the utilization target and fits in the vCPUs the event loop leaves.
6. Failures are reported, slow calls are bounded, and shutdown finishes the work in hand within the budget.
7. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
