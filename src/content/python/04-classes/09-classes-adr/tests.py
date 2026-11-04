import re

LINE_ITEMS = 1_000_000
BUDGET_MB = 100
BYTES_PER_ITEM = {"default": 152, "slots": 72}
MECHANISM_WORDS = {"descriptors": "descriptor", "properties": "propert", "post_init": "__post_init__"}


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(adr["context"].strip()) >= 80
    assert re.search(r"line item", adr["context"], re.IGNORECASE)
    assert re.search(r"memory", adr["context"], re.IGNORECASE)
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
    assert is_number(plan["estimated_memory_mb"])
    assert plan["entities"] in ["dataclass", "plain_class", "namedtuple", "pydantic"]
    assert plan["validation"] in ["descriptors", "properties", "post_init"]
    assert plan["value_objects"] in ["frozen_dataclass", "mutable"]
    assert plan["shared_behavior"] in ["mixins", "inheritance", "composition"]
    assert isinstance(plan["cooperative_super"], bool)
    assert plan["memory"] in ["slots", "default"]


@test("the memory estimate is computed from the briefing and fits the layout choice")
def _():
    plan = mod.PLAN
    memory = plan["memory"]
    expected = LINE_ITEMS * BYTES_PER_ITEM[memory] / 10**6
    estimate = plan["estimated_memory_mb"]
    assert estimate == approx(expected, rel=0.01)
    assert estimate <= BUDGET_MB


@test("the validation, entity and value object choices are coherent with the briefing")
def _():
    plan = mod.PLAN
    validation = plan["validation"]
    assert validation != "properties"
    assert validation != "post_init"
    entities = plan["entities"]
    assert entities not in ["namedtuple", "pydantic"]
    if plan["memory"] == "slots" and validation == "descriptors":
        assert entities != "dataclass"
    assert plan["value_objects"] == "frozen_dataclass"


@test("the shared behavior, the decision wording and the rejected patterns are coherent with the plan")
def _():
    plan = mod.PLAN
    shared = plan["shared_behavior"]
    assert shared != "inheritance"
    if shared == "mixins":
        assert plan["cooperative_super"] is True
    decision = mod.ADR["decision"].lower()
    mechanism = MECHANISM_WORDS[plan["validation"]]
    assert mechanism in decision
    if plan["memory"] == "slots":
        assert "slot" in decision
    rejected = plan["rejected"]
    assert isinstance(rejected, list)
    assert len(rejected) >= 2
    for entry in rejected:
        assert len(entry["pattern"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["pattern"] for entry in rejected])
