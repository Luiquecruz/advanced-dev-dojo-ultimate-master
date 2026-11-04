import asyncio
import contextlib
from collections.abc import Awaitable, Callable, Iterable
from dataclasses import dataclass
from typing import Any, Protocol, runtime_checkable

Event = dict[str, Any]
Offload = Callable[[Callable[[Event], bool], Event], Awaitable[bool]]


@runtime_checkable
class AsyncRule(Protocol):
    name: str

    async def evaluate(self, event: Event) -> bool: ...


@runtime_checkable
class CpuRule(Protocol):
    name: str

    def check(self, event: Event) -> bool: ...


@dataclass(frozen=True)
class Decision:
    event_id: str
    flags: tuple[str, ...]
    errors: ExceptionGroup | None
    timed_out: bool


def validate_event(event: object) -> Event:
    # TODO: raise ValueError unless `event` is a dict with a non-empty string "id".
    return event


async def evaluate_event(
    event: Event,
    rules: Iterable[AsyncRule | CpuRule],
    *,
    per_event_limit: int,
    deadline_s: float,
    offload: Offload,
    global_slots: asyncio.Semaphore | None = None,
) -> Decision:
    # TODO: run every rule concurrently in an asyncio.TaskGroup, at most `per_event_limit` at a time,
    # and also inside `global_slots` when the engine passes one (contextlib.nullcontext() stands in for None).
    # TODO: CPU rules go through `await offload(rule.check, event)`; never call `check` on the event loop.
    # TODO: an Exception from a rule gets the note "rule=<name>" and is collected instead of propagating;
    # CancelledError is a BaseException and must keep propagating.
    # TODO: wrap the whole group in asyncio.timeout(deadline_s); on timeout keep the flags of the rules that
    # finished and set timed_out=True. Collected errors become ExceptionGroup("rule failures", errors) or None.
    flags = []
    for rule in rules:
        if isinstance(rule, AsyncRule):
            flagged = await rule.evaluate(event)
        else:
            flagged = rule.check(event)
        if flagged:
            flags.append(rule.name)
    return Decision(event_id=event["id"], flags=tuple(sorted(flags)), errors=None, timed_out=False)


class Engine:
    def __init__(
        self,
        rules: Iterable[object],
        *,
        queue_maxsize: int,
        workers: int,
        per_event_limit: int,
        global_limit: int,
        deadline_s: float,
        offload: Offload,
        on_decision: Callable[[Decision], object],
    ) -> None:
        # TODO: raise TypeError for any rule that satisfies neither AsyncRule nor CpuRule.
        self.rules = tuple(rules)
        # TODO: bound the queue with queue_maxsize, so that submit() waits when it is full.
        self._queue: asyncio.Queue[Event] = asyncio.Queue()
        # TODO: one asyncio.Semaphore(global_limit) shared by every event of this engine.
        self._global_slots: asyncio.Semaphore | None = None
        self._workers = workers
        self._per_event_limit = per_event_limit
        self._deadline_s = deadline_s
        self._offload = offload
        self._on_decision = on_decision
        self._supervisor: asyncio.Task[None] | None = None
        self._accepting = False
        self._decided = 0

    async def start(self) -> None:
        self._accepting = True
        # TODO: run `workers` consumers, owned by one supervisor task that holds them in a TaskGroup.
        self._supervisor = asyncio.create_task(self._consume())

    async def submit(self, event: Event) -> None:
        # TODO: validate the event before it takes a queue slot, and raise RuntimeError once intake stopped.
        await self._queue.put(event)

    async def shutdown(self, drain_s: float) -> int:
        # TODO: stop intake (Queue.shutdown), let queued and in-flight events finish within drain_s,
        # cancel what is left, and return how many events were decided during the drain.
        if self._supervisor is not None:
            self._supervisor.cancel()
        return 0

    async def _consume(self) -> None:
        while True:
            event = await self._queue.get()
            try:
                decision = await evaluate_event(
                    event,
                    self.rules,
                    per_event_limit=self._per_event_limit,
                    deadline_s=self._deadline_s,
                    offload=self._offload,
                    global_slots=self._global_slots,
                )
                self._decided += 1
                self._on_decision(decision)
            finally:
                self._queue.task_done()
