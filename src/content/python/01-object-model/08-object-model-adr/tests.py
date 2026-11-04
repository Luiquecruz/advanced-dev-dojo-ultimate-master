import re

LATENCY_BUDGET_MS = 5


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
    assert re.search(r"surcharge", adr["context"], re.IGNORECASE)
    assert re.search(r"shared|alias", adr["context"], re.IGNORECASE)
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
    value_object = plan["value_object"]
    assert value_object["mutability"] in ["immutable", "mutable"]
    assert isinstance(value_object["hashable"], bool)
    assert value_object["equality"] in ["by_value", "by_identity"]
    assert value_object["inner_collections"] in ["tuple", "frozenset", "list", "set"]
    assert is_number(plan["copy_on_read_cost_ms"])
    assert plan["sharing"] in ["share_reference", "copy_on_read", "copy_on_write"]
    assert plan["copy_strategy"] in ["none", "shallow", "deep"]
    assert plan["absence"]["marker"] in ["none", "sentinel"]
    assert plan["absence"]["checks_use"] in ["is", "truthiness"]


@test("the value object design is coherent with its use as a shared cache key")
def _():
    value_object = mod.PLAN["value_object"]
    assert value_object["hashable"] is True
    assert value_object["equality"] == "by_value"
    assert value_object["mutability"] == "immutable"
    assert value_object["inner_collections"] in ["tuple", "frozenset"]


@test("the copy cost is computed from the briefing and the sharing policy is coherent with it")
def _():
    plan = mod.PLAN
    cost = plan["copy_on_read_cost_ms"]
    assert cost == approx(120, rel=0.01)
    if cost > LATENCY_BUDGET_MS:
        assert plan["sharing"] != "copy_on_read"
    if plan["sharing"] == "share_reference":
        assert plan["copy_strategy"] == "none"
    else:
        assert plan["copy_strategy"] in ["shallow", "deep"]


@test("the absence handling, the decision wording and the rejected patterns are coherent with the plan")
def _():
    plan = mod.PLAN
    assert plan["absence"]["marker"] == "sentinel"
    assert plan["absence"]["checks_use"] == "is"
    mutability = plan["value_object"]["mutability"]
    decision = mod.ADR["decision"].lower()
    assert re.search(rf"\b{mutability}\b", decision)
    rejected = plan["rejected"]
    assert isinstance(rejected, list)
    assert len(rejected) >= 2
    for entry in rejected:
        assert len(entry["pattern"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["pattern"] for entry in rejected])
