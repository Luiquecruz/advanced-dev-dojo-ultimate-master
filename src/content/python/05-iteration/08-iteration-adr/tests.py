import math

ROWS = 30_000_000
CEILING_MB = 512 - 64
BASELINE_MB = 128
OBJECT_BYTES = 1_200
PAYLOAD_BYTES = 800
BATCHES_ALIVE = 2
INSERT_MAX_ROWS = 100_000
ROW_COST_US = 200
INSERT_COST_S = 0.5
WINDOW_S = 2 * 60 * 60

CHOICES = {
    "pipeline": ["generators", "lists", "mixed"],
    "materialize_at": ["never", "sink", "each_stage"],
    "consumers": ["notify_per_batch", "tee_per_consumer", "after_full_export"],
    "resume": ["from_last_batch", "from_start", "per_row_checkpoint"],
    "resource_cleanup": ["try_finally", "context_manager", "none"],
}
INTEGER_FIELDS = ["batch_size", "batches", "table_passes"]


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
    assert "row" in context
    assert "memory" in context
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
        assert plan[field] in allowed, field
    for field in INTEGER_FIELDS:
        assert is_integer(plan[field]), field
    assert is_number(plan["peak_memory_mb"])
    assert isinstance(plan["reiterable_results"], bool)


@test("the batch size and the peak memory estimate fit the memory budget and the warehouse")
def _():
    plan = mod.PLAN
    batch_size = plan["batch_size"]
    expected_peak = BASELINE_MB + BATCHES_ALIVE * batch_size * (OBJECT_BYTES + PAYLOAD_BYTES) / 10**6
    assert batch_size >= 1
    assert batch_size <= INSERT_MAX_ROWS
    assert plan["peak_memory_mb"] == approx(expected_peak, rel=0.01)
    assert expected_peak <= CEILING_MB


@test("the insert count and the table scans fit the export window")
def _():
    plan = mod.PLAN
    batch_size = plan["batch_size"]
    passes = plan["table_passes"]
    assert batch_size >= 1
    assert plan["batches"] == math.ceil(ROWS / batch_size)
    one_scan_s = ROWS * ROW_COST_US / 10**6 + plan["batches"] * INSERT_COST_S
    assert passes >= 1
    assert passes * one_scan_s <= WINDOW_S


@test("the pipeline shape, reuse, consumers, resume and cleanup fit the briefing and the decision")
def _():
    plan = mod.PLAN
    decision = mod.ADR["decision"].lower()
    if ROWS * OBJECT_BYTES / 10**6 > CEILING_MB:
        assert plan["pipeline"] == "generators"
        assert plan["materialize_at"] != "each_stage"
    assert plan["reiterable_results"] is True
    if plan["reiterable_results"]:
        assert plan["materialize_at"] == "sink"
    assert plan["consumers"] == "notify_per_batch"
    assert plan["resume"] == "from_last_batch"
    assert plan["resource_cleanup"] != "none"
    assert "generator" in decision
    assert "batch" in decision
