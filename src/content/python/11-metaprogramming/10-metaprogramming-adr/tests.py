CORE_SUBCLASSES = 66
CORE_ABSTRACT = 6
CORE_MODULES = 48
PARTNER_TEAMS = 5
PARTNER_CLASSES = 18
PARTNER_MODULES = 12
STARTUP_BUDGET_MS = 150
CORE_STARTUP_MS = 95
IMPORT_MS_PER_MODULE = 4
METADATA_SCAN_MS = 12
EXPORTERS_PER_COMMAND = 1

CHOICES = {
    "discovery": ["entry_points", "package_scan", "central_list"],
    "loading": ["lazy", "eager"],
    "registration": ["init_subclass", "decorator", "metaclass"],
    "validation_time": ["class_creation", "first_use"],
    "trust_policy": ["allow_list", "any_installed"],
}
INTEGER_FIELDS = ["registered_classes", "allowed_distributions"]
NUMBER_FIELDS = ["eager_import_ms", "plugin_budget_ms", "lazy_import_ms"]


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
    assert "import" in context
    assert "partner" in context
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
    for field in NUMBER_FIELDS:
        assert is_number(plan[field]), field
    assert isinstance(plan["metaclass_needed"], bool)


@test("the plugin counts and import-time figures follow from the briefing numbers")
def _():
    plan = mod.PLAN
    registered = plan["registered_classes"]
    eager = plan["eager_import_ms"]
    budget = plan["plugin_budget_ms"]
    lazy = plan["lazy_import_ms"]
    expected_registered = CORE_SUBCLASSES - CORE_ABSTRACT + PARTNER_CLASSES
    expected_eager = approx((CORE_MODULES + PARTNER_MODULES) * IMPORT_MS_PER_MODULE, rel=0.01)
    expected_budget = approx(STARTUP_BUDGET_MS - CORE_STARTUP_MS, rel=0.01)
    expected_lazy = approx(METADATA_SCAN_MS + EXPORTERS_PER_COMMAND * IMPORT_MS_PER_MODULE, rel=0.01)
    assert registered == expected_registered
    assert eager == expected_eager
    assert budget == expected_budget
    assert lazy == expected_lazy


@test("discovery and loading fit the startup budget and where the plugin code is published")
def _():
    plan = mod.PLAN
    eager = plan["eager_import_ms"]
    lazy = plan["lazy_import_ms"]
    budget = plan["plugin_budget_ms"]
    if eager > budget:
        assert plan["loading"] == "lazy"
    if plan["loading"] == "lazy":
        assert lazy <= budget
    assert plan["discovery"] == "entry_points"
    assert plan["loading"] == "lazy"


@test("the registration hook and the trust policy are coherent with the plugin classes and their sources")
def _():
    plan = mod.PLAN
    decision = mod.ADR["decision"].lower()
    allowed = plan["allowed_distributions"]
    assert plan["validation_time"] == "class_creation"
    assert plan["registration"] in ["init_subclass", "metaclass"]
    assert plan["registration"] != "metaclass"
    assert plan["metaclass_needed"] is False
    if plan["discovery"] == "entry_points":
        assert plan["trust_policy"] == "allow_list"
        assert allowed == 1 + PARTNER_TEAMS
    assert "entry point" in decision
    assert "init_subclass" in decision
