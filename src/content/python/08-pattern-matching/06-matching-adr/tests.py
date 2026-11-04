TYPES_TODAY = 25
NEW_TYPES_PER_QUARTER = 5
QUARTERS = 8
MESSAGES_PER_MINUTE = 1_200_000
INSTANCES = 4
DISPATCH_CPU_SHARE = 0.02
FAILED_CASE_US = 0.13
SHARED_FILE_EDITS_ALLOWED = 1
PAYLOAD_CLASSES_GENERATED = True

CHOICES = {
    "dispatch": ["match", "if_elif", "dict_registry", "singledispatch", "polymorphism"],
    "registry_key": ["type_tag", "payload_class", "none"],
    "payload_model": ["dataclasses", "dicts", "mixed"],
    "match_role": ["central_router", "leaf_decoder", "none"],
    "extension_point": ["registry", "edit_match", "subclass"],
    "unknown_types": ["raise_to_dead_letter", "silent_default"],
}
INTEGER_FIELDS = ["types_at_horizon", "lookups_per_second", "shared_file_edits_per_quarter"]
LINEAR = ["match", "if_elif"]
EXTENSION_OF = {
    "match": "edit_match",
    "if_elif": "edit_match",
    "dict_registry": "registry",
    "singledispatch": "registry",
    "polymorphism": "subclass",
}


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


def horizon_types():
    return TYPES_TODAY + NEW_TYPES_PER_QUARTER * QUARTERS


def instance_rate():
    return MESSAGES_PER_MINUTE / 60 / INSTANCES


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    context = adr["context"].lower()
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(context.strip()) >= 80
    assert "type" in context
    assert "team" in context
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
    assert is_number(plan["linear_worst_case_us"])


@test("the growth, load and worst-case cost figures follow from the briefing numbers")
def _():
    plan = mod.PLAN
    types = plan["types_at_horizon"]
    rate = plan["lookups_per_second"]
    linear = plan["linear_worst_case_us"]
    assert types == horizon_types()
    assert rate == approx(instance_rate(), rel=0.01)
    assert linear == approx(horizon_types() * FAILED_CASE_US, rel=0.01)


@test("the dispatch mechanism, its key and the payload model fit the payload sources and the per-message budget")
def _():
    plan = mod.PLAN
    dispatch = plan["dispatch"]
    key = plan["registry_key"]
    budget_us = DISPATCH_CPU_SHARE / instance_rate() * 1_000_000
    linear_us = horizon_types() * FAILED_CASE_US
    if dispatch in LINEAR or plan["match_role"] == "central_router":
        assert linear_us <= budget_us
    assert plan["payload_model"] == "dataclasses"
    if dispatch == "singledispatch":
        assert key == "payload_class"
    if dispatch == "dict_registry":
        assert key in ["type_tag", "payload_class"]
    if dispatch == "polymorphism":
        assert not PAYLOAD_CLASSES_GENERATED


@test("the extension point, shared-file edits, unknown types and decision wording fit the team rules")
def _():
    plan = mod.PLAN
    dispatch = plan["dispatch"]
    extension = plan["extension_point"]
    edits = plan["shared_file_edits_per_quarter"]
    expected_edits = NEW_TYPES_PER_QUARTER if extension == "edit_match" else 0
    decision = mod.ADR["decision"].lower()
    assert extension == EXTENSION_OF[dispatch]
    assert edits == expected_edits
    assert edits <= SHARED_FILE_EDITS_ALLOWED
    assert plan["unknown_types"] != "silent_default"
    if dispatch == "dict_registry":
        assert "registry" in decision
    if dispatch == "singledispatch":
        assert "singledispatch" in decision
    if plan["match_role"] != "none":
        assert "match" in decision
