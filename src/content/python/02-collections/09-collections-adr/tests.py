import re

PAYLOADS = 2_000_000
COMPARISONS_PER_SECOND = 100_000_000
PAYLOAD_BYTES = 1_500


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"tenant", adr["context"], re.IGNORECASE)
    assert re.search(r"header", adr["context"], re.IGNORECASE)
    assert len(adr["decision"].strip()) >= 40
    assert re.match(r"we will\b", adr["decision"].strip(), re.IGNORECASE)


@test("the ADR alternatives and consequences have the expected shape")
def _():
    adr = mod.ADR
    assert isinstance(adr["alternatives"], list)
    assert len(adr["alternatives"]) >= 2
    for alternative in adr["alternatives"]:
        assert len(alternative["option"].strip()) >= 3
        assert len(alternative["reason"].strip()) >= 20
    assert distinct([alternative["option"] for alternative in adr["alternatives"]])
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15


@test("the plan uses only known values for every field")
def _():
    plan = mod.PLAN
    assert is_number(plan["lookups_per_second"])
    assert is_number(plan["bytes_per_payload_budget"])
    assert plan["lookup_container"] in ["dict", "set", "list"]
    assert plan["key_type"] in ["str", "tuple", "frozenset"]
    assert plan["ordering"] in ["insertion", "sorted", "none"]
    assert plan["replay_source"] in ["dict_order", "separate_list", "sorted_copy"]
    assert plan["dedupe"] in ["set", "dict.fromkeys", "sort_unique"]
    assert plan["headers"] in ["CaseInsensitiveDict", "lower_on_write", "dict"]
    assert plan["protocol"] in ["mapping", "sequence", "custom_class"]


@test("the lookup rate is computed from the briefing and the lookup design is coherent with it")
def _():
    plan = mod.PLAN
    rate = plan["lookups_per_second"]
    assert rate == approx(200_000, rel=0.01)
    scan_comparisons = rate * PAYLOADS / 2
    if scan_comparisons > COMPARISONS_PER_SECOND:
        assert plan["lookup_container"] != "list"
    assert plan["lookup_container"] == "dict"
    assert plan["protocol"] == "mapping"
    assert plan["key_type"] in ["tuple", "str"]


@test("the memory budget per payload is computed from the briefing and the order strategy is coherent with it")
def _():
    plan = mod.PLAN
    budget = plan["bytes_per_payload_budget"]
    assert budget == approx(2_000, rel=0.01)
    if 2 * PAYLOAD_BYTES > budget:
        assert plan["replay_source"] == "dict_order"
    assert plan["ordering"] == "insertion"
    assert plan["dedupe"] == "dict.fromkeys"


@test("the header strategy, the decision wording and the rejected patterns are coherent with the plan")
def _():
    plan = mod.PLAN
    assert plan["headers"] != "dict"
    key_type = plan["key_type"]
    decision = mod.ADR["decision"].lower()
    assert re.search(rf"\b{key_type}", decision)
    rejected = plan["rejected"]
    assert isinstance(rejected, list)
    assert len(rejected) >= 2
    for entry in rejected:
        assert len(entry["pattern"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["pattern"] for entry in rejected])
