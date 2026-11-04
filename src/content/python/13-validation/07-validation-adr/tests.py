EVENTS_PER_DAY = 8_000_000
SECONDS_PER_DAY = 86_400
EVENT_TYPES = 4
RELEASE_EVERY_MONTHS = 6
ACCEPTED_FOR_MONTHS = 18
LINES = 200
BYTES_PER_LINE = 300
ENVELOPE_BYTES = 4_000

CHOICES = {
    "edge_model": ["basemodel", "dataclass", "typeddict"],
    "internal_model": ["frozen_dataclass", "basemodel", "dict"],
    "mode": ["lax_at_edge_strict_inside", "lax_everywhere", "strict_everywhere"],
    "payout_flag": ["strict_bool", "lax_bool"],
    "unknown_fields": ["forbid", "ignore", "allow"],
    "validation_errors": ["structured", "strings"],
    "error_input": ["omitted", "echoed"],
    "schema_docs": ["json_schema", "wiki", "none"],
}
INTEGER_FIELDS = ["events_per_second", "schema_documents", "max_body_bytes"]


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def distinct(values):
    cleaned = [value.strip().lower() for value in values]
    return len(set(cleaned)) == len(cleaned)


def check_entries(entries):
    assert isinstance(entries, list)
    assert len(entries) >= 2
    for entry in entries:
        assert len(entry["option"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["option"] for entry in entries])


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    context = adr["context"].lower()
    decision = adr["decision"].strip().lower()
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(context.strip()) >= 80
    assert "partner" in context
    assert "schema" in context
    assert len(decision) >= 40
    assert decision.startswith("we will")


@test("the alternatives, consequences and rejected options have the expected shape")
def _():
    adr = mod.ADR
    check_entries(adr["alternatives"])
    for side in ["positive", "negative"]:
        items = adr["consequences"][side]
        assert isinstance(items, list)
        assert len(items) >= 1
        for item in items:
            assert len(item.strip()) >= 15
    check_entries(mod.PLAN["rejected"])


@test("the plan uses only known values and integers for the numeric fields")
def _():
    plan = mod.PLAN
    for field, allowed in CHOICES.items():
        value = plan[field]
        assert value in allowed, field
    for field in INTEGER_FIELDS:
        assert is_integer(plan[field]), field


@test("the rate, the schema document count and the body limit follow from the briefing numbers")
def _():
    plan = mod.PLAN
    rate = plan["events_per_second"]
    average = EVENTS_PER_DAY / SECONDS_PER_DAY
    documents = plan["schema_documents"]
    expected_documents = EVENT_TYPES * (ACCEPTED_FOR_MONTHS // RELEASE_EVERY_MONTHS)
    limit = plan["max_body_bytes"]
    largest = LINES * BYTES_PER_LINE + ENVELOPE_BYTES
    assert rate >= int(average)
    assert rate <= int(average) + 1
    assert documents == expected_documents
    assert limit >= largest
    assert limit < 2 * largest


@test("the models, modes and payout flag fit where each payload comes from")
def _():
    plan = mod.PLAN
    assert plan["edge_model"] == "basemodel"
    assert plan["mode"] == "lax_at_edge_strict_inside"
    assert plan["internal_model"] == "frozen_dataclass"
    assert plan["payout_flag"] == "strict_bool"


@test("unknown fields, error reports, documentation and the decision fit the public contract")
def _():
    plan = mod.PLAN
    decision = mod.ADR["decision"].lower()
    assert plan["unknown_fields"] == "forbid"
    assert plan["validation_errors"] == "structured"
    assert plan["error_input"] == "omitted"
    assert plan["schema_docs"] == "json_schema"
    assert "lax" in decision
    assert "strict" in decision
    assert "schema" in decision
