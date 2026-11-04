import re

DATABASE_CONNECTIONS = 1
BROKER_CHANNELS = 1
AVERAGE_REGIONS = 4
PEAK_REGIONS = 7
VALIDATED_FIELDS = 11
FIRST_ERROR_CAPACITY = 1
MECHANISM_WORDS = {
    "exit_stack": r"exit ?stack",
    "nested_with": r"nested with",
    "exception_group": r"exception ?group",
    "first_error": r"first error",
}


def is_integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


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
    assert re.search(r"region", adr["context"], re.IGNORECASE)
    assert re.search(r"lock", adr["context"], re.IGNORECASE)
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


@test("the plan uses only known values for every field and lists rejected patterns")
def _():
    plan = mod.PLAN
    assert plan["resource_management"] in ["context_managers", "try_finally", "gc"]
    assert plan["multi_resource"] in ["exit_stack", "nested_with"]
    assert is_integer(plan["peak_resources"])
    assert plan["error_model"] in ["hierarchy", "error_codes", "strings"]
    assert plan["validation_errors"] in ["exception_group", "first_error"]
    assert is_integer(plan["max_errors_reported"])
    assert plan["chaining"] in ["from_cause", "none"]
    assert isinstance(plan["context_notes"], bool)
    rejected = plan["rejected"]
    assert isinstance(rejected, list)
    assert len(rejected) >= 2
    for entry in rejected:
        assert len(entry["pattern"].strip()) >= 3
        assert len(entry["reason"].strip()) >= 20
    assert distinct([entry["pattern"] for entry in rejected])


@test("the resource count is computed from the briefing and the release strategy is coherent with it")
def _():
    plan = mod.PLAN
    peak = plan["peak_resources"]
    expected_peak = DATABASE_CONNECTIONS + BROKER_CHANNELS + PEAK_REGIONS
    average = DATABASE_CONNECTIONS + BROKER_CHANNELS + AVERAGE_REGIONS
    assert peak == approx(expected_peak)
    if peak != average:
        assert plan["multi_resource"] == "exit_stack"
    resource_management = plan["resource_management"]
    assert resource_management != "gc"
    assert resource_management != "try_finally"


@test("the number of reportable validation errors is computed from the briefing and the reporting choice can carry it")
def _():
    plan = mod.PLAN
    reported = plan["max_errors_reported"]
    assert reported == approx(VALIDATED_FIELDS)
    if reported > FIRST_ERROR_CAPACITY:
        assert plan["validation_errors"] == "exception_group"


@test("the error model, chaining and notes give callers and operators what the briefing requires, and the decision names the mechanisms")
def _():
    plan = mod.PLAN
    assert plan["error_model"] == "hierarchy"
    assert plan["chaining"] == "from_cause"
    assert plan["context_notes"] is True
    decision = mod.ADR["decision"].lower()
    for field in ["multi_resource", "validation_errors"]:
        pattern = MECHANISM_WORDS[plan[field]]
        assert re.search(pattern, decision), f"the decision does not name the {field} choice"
