import asyncio
import math
import re

FLEET_PEAK = 2000
MEASURED_CAPACITY = 400
IO_RULES = 36
MEAN_CALL_S = 0.015
P95_CALL_MS = 40
CPU_RULES = 4
CPU_RULE_S = 0.002
CPU_BUDGET_MS = 8
CONNECTION_CAP = 300
DECISION_DEADLINE_MS = 250
QUEUE_BUDGET_MS = 100
DRAIN_DEADLINE_S = 15


class Concurrency:
    def __init__(self):
        self.active = 0
        self.peak = 0

    def enter(self):
        self.active += 1
        self.peak = max(self.peak, self.active)

    def leave(self):
        self.active -= 1


class TickRule:
    """Flags the event when `flag` is true, after a few event loop ticks."""

    def __init__(self, name, flag=False, ticks=2, tracker=None, gate=None):
        self.name = name
        self.flag = flag
        self.ticks = ticks
        self.tracker = tracker or Concurrency()
        self.gate = gate

    async def evaluate(self, event):
        self.tracker.enter()
        try:
            if self.gate is not None:
                await self.gate.wait()
            for _ in range(self.ticks):
                await asyncio.sleep(0)
            return self.flag
        finally:
            self.tracker.leave()


class FailingRule:
    def __init__(self, name, error):
        self.name = name
        self.error = error

    async def evaluate(self, event):
        await asyncio.sleep(0)
        raise self.error


class StuckRule:
    """Waits on an event that is never set; records the cancellation and re-raises it."""

    def __init__(self, name="stuck"):
        self.name = name
        self.cancelled = False

    async def evaluate(self, event):
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            self.cancelled = True
            raise
        return True


class FakePool:
    """Stands in for a process pool: records each call and whether a check runs inside it."""

    def __init__(self):
        self.calls = 0
        self.running = False

    async def __call__(self, function, event):
        self.calls += 1
        await asyncio.sleep(0)
        self.running = True
        try:
            return function(event)
        finally:
            self.running = False


class CpuCheck:
    def __init__(self, name, pool, flag=False, error=None):
        self.name = name
        self.pool = pool
        self.flag = flag
        self.error = error
        self.inside_pool = []

    def check(self, event):
        self.inside_pool.append(self.pool.running)
        if self.error is not None:
            raise self.error
        return self.flag


async def within(awaitable, seconds, what):
    """Fails the test instead of hanging when `awaitable` does not finish in time."""
    try:
        async with asyncio.timeout(seconds) as guard:
            return await awaitable
    except TimeoutError:
        if guard.expired():
            raise AssertionError(f"{what} did not finish within {seconds} s") from None
        raise


def engine_for(rules, decided, **overrides):
    settings = {
        "queue_maxsize": 4,
        "workers": 1,
        "per_event_limit": 4,
        "global_limit": 8,
        "deadline_s": 5.0,
        "offload": FakePool(),
        "on_decision": lambda decision: decided.append(decision.event_id),
    }
    settings.update(overrides)
    return mod.Engine(rules, **settings)


async def ticks(count=20):
    for _ in range(count):
        await asyncio.sleep(0)


def plan_module():
    return modules["adr.py"]


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


@test("rules of one event run concurrently within the per-event limit, and CPU rules run only through offload")
async def _():
    tracker = Concurrency()
    pool = FakePool()
    io_rules = [TickRule(f"io-{index}", flag=index in (1, 4), tracker=tracker) for index in range(7)]
    sanctions = CpuCheck("sanctions", pool, flag=True)
    structuring = CpuCheck("structuring", pool)
    decision = await within(
        mod.evaluate_event({"id": "evt-1"}, [*io_rules, sanctions, structuring], per_event_limit=3, deadline_s=1.0, offload=pool),
        2.0,
        "evaluate_event",
    )
    peak = tracker.peak
    assert peak == 3
    assert decision.event_id == "evt-1"
    assert decision.flags == ("io-1", "io-4", "sanctions")
    assert decision.errors is None
    assert decision.timed_out is False
    assert pool.calls == 2
    assert sanctions.inside_pool == [True]
    assert structuring.inside_pool == [True]


@test("a failing rule keeps the event and the other verdicts, and every failure is reported together, tagged with its rule")
async def _():
    pool = FakePool()
    rules = [
        FailingRule("feature-store", ConnectionError("feature store unavailable")),
        TickRule("velocity", flag=True, ticks=4),
        TickRule("geo", flag=False, ticks=4),
        CpuCheck("ledger", pool, error=ValueError("malformed ledger row")),
        TickRule("amount", flag=True, ticks=1),
    ]
    decision = await within(
        mod.evaluate_event({"id": "evt-2"}, rules, per_event_limit=5, deadline_s=1.0, offload=pool),
        2.0,
        "evaluate_event",
    )
    assert decision.flags == ("amount", "velocity")
    assert decision.timed_out is False
    errors = decision.errors
    assert isinstance(errors, ExceptionGroup)
    kinds = sorted(type(error).__name__ for error in errors.exceptions)
    assert kinds == ["ConnectionError", "ValueError"]
    notes = sorted(note for error in errors.exceptions for note in getattr(error, "__notes__", []))
    assert notes == ["rule=feature-store", "rule=ledger"]


@test("deadlines cut slow work: an event past its deadline keeps the finished verdicts, and a drain past its deadline cancels the rest")
async def _():
    slow = StuckRule()
    rules = [TickRule("geo", flag=True, ticks=1), slow, TickRule("amount", flag=False, ticks=1)]
    decision = await within(
        mod.evaluate_event({"id": "evt-3"}, rules, per_event_limit=3, deadline_s=0.05, offload=FakePool()),
        2.0,
        "evaluate_event with a 50 ms deadline",
    )
    assert decision.timed_out is True
    assert decision.flags == ("geo",)
    assert decision.errors is None
    assert slow.cancelled is True
    stuck_in_drain = StuckRule()
    decided = []
    engine = engine_for([stuck_in_drain], decided, deadline_s=5.0)
    await engine.start()
    await engine.submit({"id": "evt-4"})
    await ticks()
    drained = await within(engine.shutdown(0.05), 2.0, "shutdown with a 50 ms drain deadline")
    assert drained == 0
    assert decided == []
    assert stuck_in_drain.cancelled is True


@test("the engine accepts only rules and valid events, waits on a full queue, caps rules across workers and drains on shutdown")
async def _():
    not_a_rule = await capture_error(lambda: engine_for([TickRule("geo"), object()], []))
    assert isinstance(not_a_rule, TypeError)
    nameless = type("Nameless", (), {"evaluate": TickRule.evaluate})()
    missing_name = await capture_error(lambda: engine_for([nameless], []))
    assert isinstance(missing_name, TypeError)
    gate = asyncio.Event()
    tracker = Concurrency()
    rules = [TickRule("geo", gate=gate, tracker=tracker), TickRule("amount", gate=gate, tracker=tracker)]
    decided = []
    engine = engine_for(rules, decided, queue_maxsize=1, workers=2, per_event_limit=4, global_limit=3)
    await engine.start()
    invalid = await capture_error(lambda: engine.submit({"amount": 120}))
    assert isinstance(invalid, ValueError)
    for event_id in ["evt-1", "evt-2", "evt-3"]:
        await within(engine.submit({"id": event_id}), 2.0, f"submit({event_id!r})")
    await ticks()
    blocked = asyncio.create_task(engine.submit({"id": "evt-4"}))
    await ticks()
    waiting = not blocked.done()
    assert waiting
    peak_while_gated = tracker.peak
    assert peak_while_gated == 3
    gate.set()
    await within(blocked, 2.0, "the blocked submit")
    decided_before = len(decided)
    drained = await within(engine.shutdown(1.0), 2.0, "shutdown")
    assert sorted(decided) == ["evt-1", "evt-2", "evt-3", "evt-4"]
    assert drained == len(decided) - decided_before
    late = await capture_error(lambda: engine.submit({"id": "evt-5"}))
    assert isinstance(late, RuntimeError)


@test("the decision record is complete and its context names the fleet peak and the deadline")
def _():
    adr = plan_module().ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    context = adr["context"]
    assert len(context.strip()) >= 80
    assert re.search(r"2[\s,. ]?000", context)
    assert re.search(r"250", context)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)
    alternatives = adr["alternatives"]
    assert len(alternatives) >= 2
    for alternative in alternatives:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    assert distinct([alternative["option"] for alternative in alternatives])
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the plan's numbers and choices fit the briefing")
def _():
    plan = plan_module().PLAN
    deployment, concurrency, cpu_rules = plan["deployment"], plan["concurrency"], plan["cpu_rules"]
    for value in [
        deployment["workers"],
        deployment["events_per_worker"],
        concurrency["per_event_limit"],
        concurrency["global_limit"],
        concurrency["queue_maxsize"],
        cpu_rules["pool_size"],
        plan["deadline"]["per_event_ms"],
        plan["shutdown_deadline_s"],
    ]:
        assert is_integer(value), f"{value!r} is not an integer"
    events_per_worker = deployment["events_per_worker"]
    assert events_per_worker >= 1
    assert events_per_worker <= MEASURED_CAPACITY
    surviving_capacity = (deployment["workers"] - 1) * events_per_worker
    assert surviving_capacity >= FLEET_PEAK
    in_flight = math.ceil(MEASURED_CAPACITY * IO_RULES * MEAN_CALL_S - 1e-9)
    global_limit = concurrency["global_limit"]
    assert global_limit >= in_flight
    assert global_limit <= CONNECTION_CAP
    per_event_limit = concurrency["per_event_limit"]
    assert per_event_limit >= 1
    assert per_event_limit <= global_limit
    p95_evaluation_ms = math.ceil(IO_RULES / per_event_limit) * P95_CALL_MS + CPU_BUDGET_MS
    evaluation_budget_ms = DECISION_DEADLINE_MS - QUEUE_BUDGET_MS
    assert p95_evaluation_ms <= evaluation_budget_ms
    per_event_ms = plan["deadline"]["per_event_ms"]
    assert per_event_ms >= p95_evaluation_ms
    assert per_event_ms <= evaluation_budget_ms
    queue_maxsize = concurrency["queue_maxsize"]
    queue_capacity = MEASURED_CAPACITY * QUEUE_BUDGET_MS // 1000
    assert queue_maxsize >= 1
    assert queue_maxsize <= queue_capacity
    processes_needed = math.ceil(MEASURED_CAPACITY * CPU_RULES * CPU_RULE_S)
    pool_size = cpu_rules["pool_size"]
    assert pool_size >= processes_needed
    shutdown_deadline_s = plan["shutdown_deadline_s"]
    assert shutdown_deadline_s >= 1
    assert shutdown_deadline_s <= DRAIN_DEADLINE_S
    assert concurrency["model"] == "asyncio"
    assert concurrency["fanout"] == "task_group"
    assert cpu_rules["where"] == "process_pool"
    assert plan["rule_interface"]["kind"] == "protocol"
    assert plan["rule_interface"]["discovery"] == "entry_points"
    assert plan["deadline"]["on_timeout"] == "fail_open_with_flag"
    rejected = plan["rejected"]
    assert len(rejected) >= 2
    for entry in rejected:
        assert len(entry["option"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["option"] for entry in rejected])
