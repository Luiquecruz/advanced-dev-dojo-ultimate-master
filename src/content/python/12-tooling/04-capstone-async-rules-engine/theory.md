# Capstone: an async rules engine

A fraud engine is a small set of language mechanisms held together by numbers. Each event fans out to 40 rules; each rule is a plugin someone else wrote; some rules wait on the network, some burn CPU, a few fail, and the whole thing has a deadline. The design below uses one mechanism per force:

```py
async def evaluate_event(event, rules, *, per_event_limit, deadline_s, offload, global_slots=None):
    event_slots = asyncio.Semaphore(per_event_limit)       # bounded fan-out per event
    flags, errors = [], []

    async def run(rule):
        async with event_slots, global_slots or contextlib.nullcontext():
            try:
                flagged = await (rule.evaluate(event) if isinstance(rule, AsyncRule) else offload(rule.check, event))
            except Exception as error:                     # CancelledError is not an Exception
                error.add_note(f"rule={rule.name}")
                errors.append(error)
                return
        if flagged:
            flags.append(rule.name)

    try:
        async with asyncio.timeout(deadline_s):            # one deadline for the whole event
            async with asyncio.TaskGroup() as group:       # no rule outlives the event
                for rule in rules:
                    group.create_task(run(rule))
    except TimeoutError:
        ...                                                # fail open, with a flag
```

The engine around it adds a bounded `asyncio.Queue` (backpressure), a `Semaphore` shared by every event (the connection cap) and a supervisor task whose `TaskGroup` owns the workers, so `shutdown` can drain with `Queue.shutdown()` and cancel what overruns the drain deadline.

## Coming from TypeScript and JavaScript

The Node version of this engine usually looks like this:

```ts
const results = await Promise.race([
  Promise.allSettled(rules.map((rule) => limit(() => rule.evaluate(event)))),
  sleep(deadlineMs).then(() => "timeout"),
]);
class GeoRule extends BaseRule { /* registered by import side effect */ }
```

Three habits break in Python:

- **Racing instead of cancelling.** When the timer wins the race, the rule promises keep running: nothing in JavaScript cancels them. Copying that with `asyncio.wait(tasks, timeout=...)` leaves slow rules running after the decision, still holding semaphore slots and connections. `asyncio.timeout` around a `TaskGroup` cancels every unfinished rule and waits for its cleanup before the decision exists.
- **Catching everything.** `catch (error)` in an async function catches whatever was thrown. `except BaseException` in Python also catches `CancelledError`, which is how the timeout and the shutdown stop a task. Swallow it and the deadline stops working; worse, `ExceptionGroup` refuses to hold it (`TypeError: Cannot nest BaseExceptions`).
- **Plugins by inheritance.** A base class makes every outside rule depend on the engine package. A `Protocol` is a structural contract: any object with `name` and `evaluate` (or `check`) is a rule, and `@runtime_checkable` lets the engine reject anything else at construction.

## How it works

**Cancellation flows down, results flow up.** When the deadline passes, `asyncio.timeout` cancels the task running `evaluate_event`. The `TaskGroup` sees the cancellation, cancels its children and waits for them; each child's `CancelledError` propagates through `except Exception` untouched; then the timeout converts the cancellation into `TimeoutError`. The flags list already holds every rule that finished, so failing open is just building the decision.

**A failure is data, not control flow.** Letting a rule's exception reach the `TaskGroup` would cancel its siblings and drop their verdicts, the opposite of the briefing. Each rule catches its own `Exception`, tags it with a note and appends it; the decision then carries `ExceptionGroup("rule failures", errors)`. Operators split it by type with `except*` or `group.split(ConnectionError)`, and every member still has its traceback and its `rule=` note.

**Two limits, two reasons.** The per-event semaphore bounds the waves of one event (latency); the global semaphore bounds the calls of the whole worker (the feature-store connection cap). Acquire the per-event slot first, so an event never holds global slots while it waits for its own.

**Little's law sizes everything.** Items in a system = arrival rate × time each spends there. Calls in flight = events/s × calls per event × mean call time; queue length = drain rate × allowed wait; CPU processes = events/s × CPU-seconds per event. A capacity measured per worker is the input; the fleet size comes last.

**Sandbox notes.** The dojo runs your engine on Pyodide's event loop. The tests await your coroutines, order events with `asyncio.sleep(0)` ticks and never wait more than 50 ms of real time for a deadline; `offload` stands in for `loop.run_in_executor(process_pool, ...)`, which cannot run in the browser.

> **Status as of November 2026:** `TaskGroup`, `asyncio.timeout()` and `ExceptionGroup`/`except*` arrived in Python 3.11, and `Queue.shutdown()` with `QueueShutDown` in 3.13 (docs.python.org asyncio reference). The dojo runs CPython 3.14 in Pyodide; Python 3.15.0 was released on 9 October 2026 (PEP 790).

## When to choose it

- **Choose this shape** for I/O-bound fan-out with a deadline: an asyncio worker, a `TaskGroup` per unit of work, semaphores for every external limit, a bounded queue at the edge, and CPU work sent to a process pool.
- **Scale horizontally** once one worker's measured capacity is known: the event loop is one core, so throughput comes from more workers, not bigger ones.
- **Avoid it** when the work is mostly CPU-bound (use processes or a compiled service) or when every call is blocking and has no async client (threads are simpler than wrapping everything in `to_thread`).
