TIMEOUT_S = 1.5
WAIT_S = 0.25
REFRESH_S = 0.5
DEADLINE_S = 15
MIN_ATTEMPTS = 2

CONCERNS = ["cache", "metrics", "retry", "auth", "rate_limit"]
CHOICES = {
    "mechanism": ["decorators", "subclassing", "global_interceptors", "monkey_patching"],
    "time_source": ["injected_clock", "system_clock", "patched_time_module"],
    "state_location": ["closure", "class_attribute", "module_global"],
    "retried_errors": ["transient_only", "all_exceptions"],
}
INTEGER_FIELDS = ["retry_attempts", "max_requests_per_call"]
MECHANISM_WORDS = {
    "decorators": "decorator",
    "subclassing": "subclass",
    "global_interceptors": "interceptor",
    "monkey_patching": "patch",
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


def worst_case(order, attempts):
    requests = 2 * attempts
    if order.index("auth") < order.index("retry"):
        one_run = attempts * TIMEOUT_S + (attempts - 1) * WAIT_S
        return requests, 2 * one_run + REFRESH_S
    per_attempt = 2 * TIMEOUT_S + REFRESH_S
    return requests, attempts * per_attempt + (attempts - 1) * WAIT_S


@test("the ADR record is complete and its context is grounded in the briefing")
def _():
    adr = mod.ADR
    context = adr["context"].lower()
    assert is_integer(adr["id"]) and adr["id"] > 0
    assert adr["status"] == "accepted"
    assert len(adr["title"].strip()) >= 10
    assert len(context.strip()) >= 80
    assert "team" in context
    assert "deadline" in context
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
    assert isinstance(plan["order"], list)
    assert sorted(plan["order"]) == sorted(CONCERNS)
    assert isinstance(plan["metadata_preserved"], bool)
    for field in INTEGER_FIELDS:
        assert is_integer(plan[field]), field
    assert is_number(plan["worst_case_latency_s"])


@test("the order of the concerns meets the dashboard, cache, token and quota requirements")
def _():
    order = mod.PLAN["order"]
    assert sorted(order) == sorted(CONCERNS)
    position = {name: index for index, name in enumerate(order)}
    assert position["metrics"] < position["cache"]
    for inner in ["auth", "retry", "rate_limit"]:
        assert position["cache"] < position[inner], inner
    assert position["auth"] < position["retry"]
    assert position["retry"] < position["rate_limit"]
    assert position["auth"] < position["rate_limit"]


@test("the attempt budget, request count and worst-case latency fit the order and the deadline")
def _():
    plan = mod.PLAN
    order = plan["order"]
    attempts = plan["retry_attempts"]
    assert sorted(order) == sorted(CONCERNS)
    assert attempts >= MIN_ATTEMPTS
    requests, worst = worst_case(order, attempts)
    _, worst_with_one_more = worst_case(order, attempts + 1)
    assert plan["max_requests_per_call"] == requests
    assert plan["worst_case_latency_s"] == approx(worst, rel=0.01)
    assert worst <= DEADLINE_S
    assert worst_with_one_more > DEADLINE_S


@test("the mechanism, state, time source, metadata and retried errors fit the briefing and the decision")
def _():
    plan = mod.PLAN
    decision = mod.ADR["decision"].lower()
    assert plan["mechanism"] not in ["subclassing", "global_interceptors", "monkey_patching"]
    assert plan["state_location"] == "closure"
    assert plan["time_source"] == "injected_clock"
    assert plan["metadata_preserved"] is True
    assert plan["retried_errors"] == "transient_only"
    assert MECHANISM_WORDS[plan["mechanism"]] in decision
    if plan["metadata_preserved"]:
        assert "wraps" in decision
    if plan["time_source"] == "injected_clock":
        assert "clock" in decision
