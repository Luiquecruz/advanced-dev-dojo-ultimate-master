import math

EVENTS_PER_SECOND = 1_200
CALLS_PER_EVENT = 2
MEAN_LATENCY_S = 0.020
QUOTA_PER_SECOND = 3_000
STALE_AFTER_S = 0.5
CPU_SECONDS_PER_EVENT = 0.001
CPU_TARGET = 0.7
VCPUS = 4
LOOP_VCPUS = 1
SHUTDOWN_BUDGET_S = 10

CHOICES = {
    "io_model": ["asyncio", "threads", "processes"],
    "fanout": ["task_group", "gather", "unbounded_tasks"],
    "backpressure": ["bounded_queue", "none"],
    "cpu_work": ["process_pool", "event_loop", "to_thread"],
    "timeouts": ["per_call", "none"],
    "failure_handling": ["exception_group", "swallow"],
    "shutdown": ["drain_with_deadline", "kill"],
}
INTEGER_FIELDS = ["concurrency_limit", "queue_maxsize", "cpu_pool_size", "shutdown_deadline_s"]


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


def check_entries(entries, key):
    assert isinstance(entries, list)
    assert len(entries) >= 2
    for entry in entries:
        assert len(entry[key].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry[key] for entry in entries])


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    context = adr["context"].lower()
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(context.strip()) >= 80
    assert "event" in context
    assert "quota" in context
    assert len(adr["decision"].strip()) >= 40
    assert adr["decision"].strip().lower().startswith("we will")


@test("the alternatives, consequences and rejected patterns have the expected shape")
def _():
    adr = mod.ADR
    check_entries(adr["alternatives"], "option")
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15
    check_entries(mod.PLAN["rejected"], "pattern")


@test("the plan uses only known values and numeric types for every field")
def _():
    plan = mod.PLAN
    for field, allowed in CHOICES.items():
        value = plan[field]
        assert value in allowed, field
    for field in INTEGER_FIELDS:
        assert is_integer(plan[field]), field
    assert is_number(plan["expected_in_flight"])


@test("the in-flight estimate and the concurrency settings fit the briefing numbers")
def _():
    plan = mod.PLAN
    expected = approx(EVENTS_PER_SECOND * CALLS_PER_EVENT * MEAN_LATENCY_S, rel=0.01)
    in_flight = plan["expected_in_flight"]
    limit = plan["concurrency_limit"]
    quota_ceiling = QUOTA_PER_SECOND * MEAN_LATENCY_S
    assert in_flight == expected
    assert limit >= in_flight
    assert limit <= quota_ceiling
    assert plan["io_model"] == "asyncio"
    assert plan["fanout"] != "unbounded_tasks"


@test("the queue and CPU settings fit the freshness, CPU and core budgets")
def _():
    plan = mod.PLAN
    queue_maxsize = plan["queue_maxsize"]
    stale_ceiling = EVENTS_PER_SECOND * STALE_AFTER_S
    pool = plan["cpu_pool_size"]
    pool_floor = math.ceil(EVENTS_PER_SECOND * CPU_SECONDS_PER_EVENT / CPU_TARGET)
    pool_ceiling = VCPUS - LOOP_VCPUS
    assert plan["backpressure"] == "bounded_queue"
    assert queue_maxsize >= 1
    assert queue_maxsize <= stale_ceiling
    assert plan["cpu_work"] == "process_pool"
    assert pool >= pool_floor
    assert pool <= pool_ceiling


@test("failure handling, timeouts, shutdown and the decision wording are coherent with the plan")
def _():
    plan = mod.PLAN
    decision = mod.ADR["decision"].lower()
    deadline = plan["shutdown_deadline_s"]
    assert plan["failure_handling"] != "swallow"
    if plan["failure_handling"] == "exception_group":
        assert plan["fanout"] == "task_group"
    assert plan["timeouts"] == "per_call"
    assert plan["shutdown"] == "drain_with_deadline"
    assert deadline >= 1
    assert deadline <= SHUTDOWN_BUDGET_S
    assert "queue" in decision
    assert "process" in decision
    if plan["fanout"] == "task_group":
        assert "task group" in decision or "taskgroup" in decision
