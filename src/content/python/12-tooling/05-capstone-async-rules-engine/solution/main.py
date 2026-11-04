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
    if not isinstance(event, dict):
        raise ValueError(f"an event is a dict, got {type(event).__name__}")
    event_id = event.get("id")
    if not isinstance(event_id, str) or not event_id.strip():
        raise ValueError("an event needs a non-empty string 'id'")
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
    event_slots = asyncio.Semaphore(per_event_limit)
    shared_slots = global_slots if global_slots is not None else contextlib.nullcontext()
    flags: list[str] = []
    errors: list[Exception] = []

    async def run(rule: AsyncRule | CpuRule) -> None:
        async with event_slots, shared_slots:
            try:
                if isinstance(rule, AsyncRule):
                    flagged = await rule.evaluate(event)
                else:
                    flagged = await offload(rule.check, event)
            except Exception as error:
                error.add_note(f"rule={rule.name}")
                errors.append(error)
                return
        if flagged:
            flags.append(rule.name)

    timed_out = False
    try:
        async with asyncio.timeout(deadline_s):
            async with asyncio.TaskGroup() as group:
                for rule in rules:
                    group.create_task(run(rule))
    except TimeoutError:
        timed_out = True
    return Decision(
        event_id=event["id"],
        flags=tuple(sorted(flags)),
        errors=ExceptionGroup("rule failures", errors) if errors else None,
        timed_out=timed_out,
    )


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
        self.rules = tuple(rules)
        for rule in self.rules:
            if not isinstance(rule, (AsyncRule, CpuRule)):
                raise TypeError(f"{rule!r} is not a rule: it needs a name and evaluate() or check()")
        self._queue: asyncio.Queue[Event] = asyncio.Queue(maxsize=queue_maxsize)
        self._global_slots = asyncio.Semaphore(global_limit)
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
        self._supervisor = asyncio.create_task(self._supervise())

    async def submit(self, event: Event) -> None:
        validate_event(event)
        if not self._accepting:
            raise RuntimeError("the engine is not accepting events")
        await self._queue.put(event)

    async def shutdown(self, drain_s: float) -> int:
        self._accepting = False
        self._queue.shutdown()
        decided_before = self._decided
        if self._supervisor is not None:
            try:
                async with asyncio.timeout(drain_s):
                    await self._supervisor
            except TimeoutError:
                pass
        return self._decided - decided_before

    async def _supervise(self) -> None:
        async with asyncio.TaskGroup() as group:
            for _ in range(self._workers):
                group.create_task(self._consume())

    async def _consume(self) -> None:
        while True:
            try:
                event = await self._queue.get()
            except asyncio.QueueShutDown:
                return
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
